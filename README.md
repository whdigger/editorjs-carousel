![](https://badgen.net/badge/Editor.js/v2.0/blue)

# Carousel Tool

Carousel/Gallery Block for the [Editor.js](https://editorjs.io).

![](./img/prelaod.png)

## Features

- Uploading file from the device
- Preload image
- Pasting copied content from the web
- Pasting images by drag-n-drop - not support multiply 
- Pasting files and screenshots from Clipboard - not support multiply 
 
**Note** This Tool requires server-side implementation for file uploading. See [backend response format](#server-format) for more details.

## Installation

### Install via NPM

Get the package

```shell
yarn add whdigger/editorjs-carousel
```

Include module at your application

```javascript
import ImageTool from '@editorjs/carousel';
```

### Manual downloading and connecting

1. Upload folder `dist` from repository
2. Add `dist/bundle.js` file to your page.

## Usage

Add a new Tool to the `tools` property of the Editor.js initial config.

```javascript
<script src="plugins/editorjs-carousel/dist/bundle.js"></script>
// or if you use webpack
import Carousel from 'Carousel';
// or if you inject ImageTool via standalone script
const Carousel = window.Carousel;
 
var editor = EditorJS({
  ...

  tools: {
    ...
    carousel: {
      class: Carousel,
      config: {
        multiple: true,
        endpoints: {
          byFile: 'http://localhost:8008/uploadFile', // Your endpoint that provides uploading by Url
          byUrl: 'http://localhost:8008/fetchUrl'
        },
      }
    }
  }

  ...
});
```

## Config Params

Image Tool supports these configuration parameters:

| Field                    | Type                                                | Description                                                                                                                                                                             |
|--------------------------|-----------------------------------------------------|-----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------|
| endpoints                | `{byFile: string, byUrl: string}`                   | Endpoints for file uploading.                                                                                                                                                           |
| field                    | `string`                                            | (default: `image`) Name of uploaded image field in POST request                                                                                                                         |
| types                    | `string`                                            | (default: `image/*`) Mime-types of files that can be [accepted with file selection](https://github.com/codex-team/ajax#accept-string).                                                  |
| multiple                 | `boolean`                                           | (default: `true`) Get multiply download files                                                                                                                                           |
| additionalRequestData    | `object`                                            | Object with any data you want to send with uploading requests                                                                                                                           |
| additionalRequestHeaders | `object`                                            | Object with any custom headers which will be added to request. [See example](https://github.com/codex-team/ajax/blob/e5bc2a2391a18574c88b7ecd6508c29974c3e27f/README.md#headers-object) |
| captionPlaceholder       | `string`                                            | (default: `Caption`) Placeholder for Caption input                                                                                                                                      |
| buttonContent            | `string`                                            | Allows to override HTML content of «Select file» button                                                                                                                                 |
| uploader                 | `{{uploadByFile: function, uploadByUrl: function}}` | Optional custom uploading methods. See details below.                                                                                                                                   |

Note that if you don't implement your custom uploader methods, the `endpoints` param is required.

Endpoints contains 2 fields:
* __byFile__ - for file uploading. If not set file was transfer as base64 when you send submit button.
* __byUrl__ - for uploading by URL. If not set file was transfer as url when you send submit button.

## Output data

This Tool returns `data` with following format

| Field     | Type     | Description                  |
|-----------|----------|------------------------------|
| file      | `object` | Uploaded file meta data.     |
| file.type | `string` | Type upload image.           |
| file.name | `string` | File name.                   |
| file.meta | `string` | File meta context.           |
| url       | `string` | Path to file or base64 text. |
| caption   | `string` | image's caption              |


```json
{
  "type": "carousel",
  "data": [
    {
      "url": "plugins/editorjs-carousel/dev/.tmp/upload_2785b3a33f8651c57e84df508adc6d3b.jpg",
      "file": {
        "type": "upload",
        "name": null,
        "meta": {
          "width":100
        }
      },
      "caption": "Roadster // tesla.com"
    }
  ]
}
```

# Backend

You can use the `npm run server` command for backend download service. To get the correct link with server, you need set to set the env variable for ex: `ROOT_DIR=/home/username/Project/editorJs/plugins/editorjs-carousel/`

## Backend response format <a name="server-format"></a>

This Tool works by one of the following schemes:

1. Uploading files from the device
2. Uploading by URL (handle image-like URL's pasting)
3. Uploading by drag-n-drop file
4. Uploading by pasting from Clipboard

### Uploading files from device <a name="from-device"></a>

Scenario:

1. User select file from the device
2. Tool sends it to **your** backend (on `config.endpoint.byFile` route)
3. Your backend should save file and return file data with JSON at specified format.
4. Image tool shows saved image and stores server answer

So, you can implement backend for file saving by your own way. It is a specific and trivial task depending on your
environment and stack.

Response of your uploader **should** cover following format:

```json5
{
  "success": 1,
  "files": [
    {
      "url": "https://www.tesla.com/tesla_theme/assets/img/_vehicle_redesign/roadster_and_semi/roadster/hero.jpg",
     }
  ]
}
```

**success** - uploading status. 1 for successful, 0 for failed

**file** - uploaded file data. **Must** contain an `url` field with full public path to the uploaded image.

### Uploading by pasted URL

Scenario:

1. User pastes an URL of the image file to the Editor
2. Editor pass pasted string to the Image Tool
3. Tool sends it to **your** backend (on `config.endpoint.byUrl` route) via 'url' POST-parameter
3. Your backend should accept URL, **download and save the original file by passed URL** and return file data with JSON at specified format.
4. Image tool shows saved image and stores server answer

Response of your uploader should be at the same format as described at «[Uploading files from device](#from-device)» section


### Uploading by drag-n-drop or from Clipboard

Your backend will accept file as FormData object in field name, specified by `config.field` (by default, «`image`»).
You should save it and return the same response format as described above.

## Providing custom uploading methods

As mentioned at the Config Params section, you have an ability to provide own custom uploading methods.
It is a quite simple: implement `uploadByFile` and `uploadByUrl` methods and pass them via `uploader` config param.
Both methods must return a Promise that resolves with response in a format that described at the [backend response format](#server-format) section.


| Method         | Arguments | Return value | Description |
| -------------- | --------- | -------------| ------------|
| uploadByFile   | `File`    | `{Promise.<{success, file: {url}}>}` | Upload file to the server and return an uploaded image data |
| uploadByUrl    | `string`  | `{Promise.<{success, file: {url}}>}` | Send URL-string to the server, that should load image by this URL and return an uploaded image data |

Example:

```js
import ImageTool from '@editorjs/image';

var editor = EditorJS({
  ...

  tools: {
    ...
    image: {
      class: ImageTool,
      config: {
        /**
         * Custom uploader
         */
        uploader: {
          /**
           * Upload file to the server and return an uploaded image data
           * @param {File} file - file selected from the device or pasted by drag-n-drop
           * @return {Promise.<{success, file: {url}}>}
           */
          uploadByFile(file){
            // your own uploading logic here
            return MyAjax.upload(file).then(() => {
              return {
                success: 1,
                file: {
                  url: 'https://codex.so/upload/redactor_images/o_80beea670e49f04931ce9e3b2122ac70.jpg',
                  // any other image data you want to store, such as width, height, color, extension, etc
                }
              };
            });
          },

          /**
           * Send URL-string to the server. Backend should load image by this URL and return an uploaded image data
           * @param {string} url - pasted image URL
           * @return {Promise.<{success, file: {url}}>}
           */
          uploadByUrl(url){
            // your ajax request for uploading
            return MyAjax.upload(file).then(() => {
              return {
                success: 1,
                file: {
                  url: 'https://codex.so/upload/redactor_images/o_e48549d1855c7fc1807308dd14990126.jpg',,
                  // any other image data you want to store, such as width, height, color, extension, etc
                }
              }
            })
          }
        }
      }
    }
  }

  ...
});
```
