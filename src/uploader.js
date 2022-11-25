import ajax from '@codexteam/ajax';

/**
 * Module for file uploading. Handle 3 scenarios:
 *  1. Select file from device and upload
 *  2. Upload by pasting URL
 *  3. Upload by pasting file from Clipboard or by Drag'n'Drop
 */
export default class Uploader {
  /**
   * @param {ImageConfig} config
   * @param {Function} onUpload - one callback for all uploading (file, url, d-n-d, pasting)
   * @param {Function} onUploadAfterPreview - one callback for all uploading (file, url, d-n-d, pasting) after preview
   * @param {Function} onError - callback for uploading errors
   */
  constructor({ config, onUpload, onUploadAfterPreview, onError }) {
    this.config = config;
    this.onUpload = onUpload;
    this.onUploadAfterPreview = onUploadAfterPreview;
    this.onError = onError;
  }

  /**
   * Handle clicks on encode file button
   */
  encodeSelectedFile() {
    const upload = ajax.selectFiles({
      accept: this.config.types,
      multiple: this.config.multiple,
    }).then((files) => {
      const responseBody = {
        success: 1,
        files: [],
      };

      for (const file of files) {
        responseBody.files.push({ url: URL.createObjectURL(file) });
      }

      return new Promise((resolve, reject) => {
        resolve(responseBody);
      });
    });

    upload.then((response) => {
      this.onUpload(response);
    }).catch((error) => {
      this.onError(error);
    });
  }

  /**
   * Handle clicks on the upload file button
   * Fires ajax.transport()
   *
   * @param {Function} onPreview - callback fired when preview is ready
   */
  uploadSelectedFile({ onPreview }) {
    const preparePreview = function (file) {
      const base64 = URL.createObjectURL(file);

      onPreview(base64);
    };

    /**
     * Custom uploading
     * or default uploading
     */
    let upload;

    // custom uploading
    if (this.config.uploader && typeof this.config.uploader.uploadByFile === 'function') {
      upload = ajax.selectFiles({
        accept: this.config.types,
        multiple: this.config.multiple,
      }).then((files) => {
        for (const file of files) {
          preparePreview(file);
        }

        const customUpload = this.config.uploader.uploadByFile(files);

        if (!isPromise(customUpload)) {
          console.warn('Custom uploader method uploadByFile should return a Promise');
        }

        return customUpload;
      });

    // default uploading
    } else {
      upload = ajax.transport({
        url: this.config.endpoints.byFile,
        data: this.config.additionalRequestData,
        accept: this.config.types,
        headers: this.config.additionalRequestHeaders,
        multiple: this.config.multiple,
        beforeSend: (files) => {
          for (const file of files) {
            preparePreview(file);
          }
        },
        fieldName: this.config.field,
      }).then((response) => response.body);
    }

    upload.then((response) => {
      this.onUploadAfterPreview(response);
    }).catch((error) => {
      this.onError(error);
    });
  }

  /**
   * Handle clicks on encode file button
   *
   * @param urls - list files when need encode
   */
  setUrl(urls) {
    const responseBody = {
      success: 1,
      files: [],
    };

    for (const url of urls) {
      responseBody.files.push({ url: url });
    }

    this.onUpload(responseBody);
  }

  /**
   * Handle clicks on the upload file button
   * Fires ajax.post()
   *
   * @param {string} urls - image source url
   */
  uploadByUrl(urls) {
    let upload;

    /**
     * Custom uploading
     */
    if (this.config.uploader && typeof this.config.uploader.uploadByUrl === 'function') {
      upload = this.config.uploader.uploadByUrl(urls);

      if (!isPromise(upload)) {
        console.warn('Custom uploader method uploadByUrl should return a Promise');
      }
    } else {
      /**
       * Default uploading
       */
      upload = ajax.post({
        url: this.config.endpoints.byUrl,
        data: Object.assign({
          url: urls,
        }, this.config.additionalRequestData),
        type: ajax.contentType.JSON,
        headers: this.config.additionalRequestHeaders,
      }).then(response => response.body);
    }

    upload.then((response) => {
      this.onUpload(response);
    }).catch((error) => {
      this.onError(error);
    });
  }

  /**
   * Handle clicks on encode file button
   */
  encodeFile(files) {
    const responseBody = {
      success: 1,
      files: [],
    };

    for (const file of files) {
      responseBody.files.push({ url: URL.createObjectURL(file) });
    }

    this.onUpload(responseBody);
  }

  /**
   * Handle clicks on the upload file button
   * Fires ajax.post()
   *
   * @param {File} files - file pasted by drag-n-drop
   * @param {Function} onPreview - file pasted by drag-n-drop
   */
  uploadByFile(files, { onPreview }) {

    const preparePreview = function (file) {
      const base64 = URL.createObjectURL(file);
      onPreview(base64);
    };

    let upload;

    for (const file of files) {
      preparePreview(file);
    }

    /**
     * Custom uploading
     */
    if (this.config.uploader && typeof this.config.uploader.uploadByFile === 'function') {
      upload = this.config.uploader.uploadByFile(files);

      if (!isPromise(upload)) {
        console.warn('Custom uploader method uploadByFile should return a Promise');
      }
    } else {
      /**
       * Default uploading
       */
      const formData = new FormData();

      for (const file of files) {
        formData.append(this.config.field + '[]', file);
      }

      if (this.config.additionalRequestData && Object.keys(this.config.additionalRequestData).length) {
        Object.entries(this.config.additionalRequestData).forEach(([name, value]) => {
          formData.append(name, value);
        });
      }

      upload = ajax.post({
        url: this.config.endpoints.byFile,
        data: formData,
        type: ajax.contentType.JSON,
        multiple: this.config.multiple,
        headers: this.config.additionalRequestHeaders,
      }).then(response => response.body);
    }

    upload.then((response) => {
      this.onUploadAfterPreview(response);
    }).catch((error) => {
      this.onError(error);
    });
  }
}

/**
 * Check if passed object is a Promise
 *
 * @param  {*}  object - object to check
 * @returns {boolean}
 */
function isPromise(object) {
  return Promise.resolve(object) === object;
}
