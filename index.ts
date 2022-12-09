import { gray, green, yellow, white } from 'chalk'
import { parseConfig, modifyPDF } from './lib'

const log = console.log
const path = process.argv[2] || `${__dirname}/config.json`

;(async () => {
  log()
  log('> Using config', path)
  log()
  const config = parseConfig(path)

  if (config) {
    log(white.bold('src:'), green(config.src))
    log(white.bold('dest:'), green(config.dest))
    log(white.bold('fontSize:'), green(config.fontSize))
    log(white.bold('writes:'))

    const pad = config.writes.reduce((acc, input) => {
      return input[0].length > acc ? input[0].length : acc
    }, 0)

    log()
    for (const input of config.writes) {
      log(
        gray(`  ${input[0]}`.padEnd(pad + 2)),
        gray('→'),
        green(input[1]),
        gray(`${input[2]},${input[3]}`),
      )
    }

    log()
    log('> Writing to PDF')
    const filename = await modifyPDF(config)
    log('> PDF saved as', yellow(filename))
  }
})()
