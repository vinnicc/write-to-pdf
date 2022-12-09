/**
 * As of December 12, 2022, pdf-lib cannot search for text outside of form fields,
 * hence we need to use it together with pdf.js. See https://github.com/Hopding/pdf-lib/issues/93
 * for more details about this limitation.
 */
import fs from 'fs'
import * as pdfLib from 'pdf-lib'
import * as pdfJs from 'pdfjs-dist'
import type {
  PDFDocumentProxy,
  TextItem,
  TextMarkedContent,
} from 'pdfjs-dist/types/src/display/api'
import z from 'zod'
import { fromZodError } from 'zod-validation-error'

class LibError extends Error {
  constructor(message: string) {
    super(message)
    Object.setPrototypeOf(this, LibError.prototype)
  }
}

export const configSchema = z.object({
  src: z.string().min(1),
  dest: z.string().min(1),
  fontSize: z.number().min(1),
  // writes tuple: [strToSearch, strToWrite, xOffset, yOffset]
  writes: z.array(z.tuple([z.string().min(1), z.string().min(1), z.number(), z.number()])),
})
export type Config = z.infer<typeof configSchema>

export const parseConfig = (path: string) => {
  const configFile = fs.readFileSync(path, 'utf8')
  const config = JSON.parse(configFile)

  try {
    return configSchema.parse(config)
  } catch (err) {
    const validationError = fromZodError(err as z.ZodError)

    console.log(validationError.message)
  }
}

const isTextItem = (item: TextItem | TextMarkedContent): item is TextItem =>
  item.hasOwnProperty('str')

// Filter consecutive `TextItem`s containing the string we're looking for.
// This is because PDF text objects aren't necessarily grouped as words.
export const filterItems = <T extends { str: string }>(searchStr: string, textItems: T[]) => {
  let itemsFound: T[] = []
  let strLeft = searchStr
  let strSoFar = ''

  for (const item of textItems) {
    // Check if item contains start of string
    const isStart = strLeft.startsWith(item.str)
    // Also check if item will complete the search
    const isLast = (strSoFar + item.str).includes(searchStr)

    if (isStart || isLast) {
      strLeft = strLeft.slice(item.str.length)
      strSoFar += item.str
      itemsFound.push(item)

      if (isLast) {
        return itemsFound
      }
    } else {
      strLeft = searchStr
      strSoFar = ''
      itemsFound = []
    }
  }

  return []
}

const findTextCoords = async (
  pdf: PDFDocumentProxy,
  pageNumber: number,
  searchStr: string,
): Promise<[number, number]> => {
  const page = await pdf.getPage(pageNumber)
  const content = await page.getTextContent()
  const textItems = content.items.filter(isTextItem)
  const matches = filterItems(searchStr, textItems)

  if (matches.length > 0) {
    const [x, y] = matches[0].transform.slice(-2)
    return [x, y]
  } else {
    // Fail early since we always intend to find the text
    throw new LibError(`Could not find coordinates for text: "${searchStr}".`)
  }
}

const drawText = async (
  pdfFromPdfLib: pdfLib.PDFDocument,
  pdfFromPdfJs: PDFDocumentProxy,
  pageNumber: number,
  strToSearch: string,
  strToDraw: string,
  fontSize: number,
  font: pdfLib.PDFFont,
  color: pdfLib.Color,
  xOffset: number,
  yOffset: number,
) => {
  const page = pdfFromPdfLib.getPage(pageNumber - 1) // pdf-lib pages are 0-indexed
  const [x, y] = await findTextCoords(pdfFromPdfJs, pageNumber, strToSearch)

  page.drawText(strToDraw, {
    x: x + xOffset,
    y: y + yOffset,
    size: fontSize,
    font: font,
    color: color,
  })
}

export async function modifyPDF(config: Config) {
  const file = fs.readFileSync(config.src)
  const pdfFromPdfLib = await pdfLib.PDFDocument.load(file)
  const pdfFromPdfJs = await pdfJs.getDocument(config.src).promise
  const font = pdfFromPdfLib.getForm().getDefaultFont()
  const color = pdfLib.rgb(0, 0, 1) // TODO: Move to config

  try {
    for (const [search, draw, x, y] of config.writes) {
      await drawText(
        pdfFromPdfLib,
        pdfFromPdfJs,
        1,
        search,
        draw,
        config.fontSize,
        font,
        color,
        x,
        y,
      )
    }
  } catch (err) {
    if (err instanceof LibError) {
      console.log(err.message)
    } else {
      throw err
    }
  }

  const pdfBytes = await pdfFromPdfLib.save()
  const date = new Date()
  const formattedDate = date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  })
  const dest = config.dest.replace('{DATE}', formattedDate)

  fs.writeFileSync(dest, pdfBytes)

  return dest
}
