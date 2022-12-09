# write-to-pdf

Every so often I have to fill up a PDF form with poor text structure and no form metadata. I needed a quick solution to do the following:

- Search for text and use its position as an anchor for writing
- Save the PDF with a dynamic filename
- Use a file-based configuration

## Installation

- Requires Node.js

```sh
$ git clone https://github.com/vinnicc/write-to-pdf
$ cd write-to-pdf
```

## Usage

Rename and edit the provided [`config.example.json`](config.example.json) file.

```sh
$ cp config.example.json config.json
$ npm start

# or
$ npm start /path/to/another-config.json
```

This runs `npx ts-node index.ts [configFile]`. By default it looks for `config.json`, but providing a config file explicitly helps when you have to run the command for different PDFs.

## TODO:

- Specify nth occurence of string to find
- Add color and size config (default and override per write)
- Include image overlays
