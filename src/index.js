// eslint-disable-next-line no-unused-vars
import css from './index.css';

import ToolboxIcon from './svg/toolbox.svg';

// eslint-disable-next-line require-jsdoc
import Uploader from './uploader';
import buttonIcon from './svg/button-icon.svg';

// eslint-disable-next-line require-jsdoc
export default class Carousel {
  /**
   * Notify core that read-only mode is supported
   *
   * @returns {boolean}
   */
  static get isReadOnlySupported() {
    return true;
  }

  /**
   * @param {CarousellData} data - previously saved data
   * @param {CarouselConfig} config - user config for Tool
   * @param {object} api - Editor.js API
   * @param {boolean} tool.readOnly - read-only mode flag
   */
  constructor({ data, config, api, readOnly }) {
    this.api = api;
    this.readOnly = readOnly;
    this.data = data;
    this.IconClose = '<svg class="icon icon--cross" width="12px" height="12px"><use xmlns:xlink="http://www.w3.org/1999/xlink" xlink:href="#cross"></use></svg>';
    this.config = {
      endpoints: config.endpoints || '',
      additionalRequestData: config.additionalRequestData || {},
      additionalRequestHeaders: config.additionalRequestHeaders || {},
      field: config.field || 'image',
      types: config.types || 'image/*',
      multiple: config.multiple || false,
      captionPlaceholder: config.captionPlaceholder || 'Caption',
      buttonContent: config.buttonContent || '',
      uploader: config.uploader || undefined
    };

    this.encodeFile = !this.config.endpoints.byFile;

    /**
     * Module for file uploading
     */
    this.uploader = new Uploader({
      config: this.config,
      onUpload: (response) => this.onUpload(response),
      onError: (error) => this.uploadingFailed(error)
    });
  }

  /**
   * CSS classes
   * @constructor
   */
  get CSS() {
    return {
      baseClass: this.api.styles.block,
      loading: this.api.styles.loader,
      input: this.api.styles.input,
      button: this.api.styles.button,

      /**
       * Tool's classes
       */
      wrapper: 'carousel-wrapper',
      addButton: 'carousel-addImage',
      block: 'carousel-block',
      item: 'carousel-item',
      removeBtn: 'carousel-removeBtn',
      inputUrl: 'carousel-inputUrl',
      caption: 'carousel-caption',
      list: 'carousel-list',
      imagePreloader: 'image-tool__image-preloader'
    };
  };

  /**
   * Get Tool toolbox settings
   * icon - Tool icon's SVG
   * title - title to show in toolbox
   *
   * @return {{icon: string, title: string}}
   */
  static get toolbox() {
    return {
      icon: ToolboxIcon,
      title: 'Carousel',
    };
  }

  /**
   * Renders Block content
   * @public
   *
   * @return {HTMLDivElement}
   */
  render() {
    /*
     * Structure
     * <wrapper>
     *  <list>
     *    <item/>
     *    ...
     *  </list>
     *  <addButton>
     * </wrapper>
     */
    // Создаем базу для начала
    this.wrapper = make('div', [ this.CSS.wrapper ]);
    this.list = make('div', [ this.CSS.list ]);
    this.addButton = this.createAddButton();

    this.list.appendChild(this.addButton);
    this.wrapper.appendChild(this.list);
    if (this.data.length > 0) {
      for (const load of this.data) {
        const loadItem = this.creteNewItem(load.url, load.caption);

        this.list.insertBefore(loadItem, this.addButton);
      }
    }
    return this.wrapper;
  }

  // eslint-disable-next-line require-jsdoc
  save(blockContent) {
    const list = blockContent.getElementsByClassName(this.CSS.item);
    const data = [];

    if (list.length > 0) {
      for (const item of list) {
        if (item.firstChild.value) {
          data.push({
            url: item.firstChild.value,
            file: {
              encode: item.firstChild.getAttribute('data-encode'),
              name: item.firstChild.getAttribute('data-name'),
            },
            caption: item.lastChild.value
          });
        }
      }
    }
    return data;
  }

  /**
   * Specify paste substitutes
   *
   * @see {@link https://github.com/codex-team/editor.js/blob/master/docs/tools.md#paste-handling}
   * @returns {{tags: string[], patterns: object<string, RegExp>, files: {extensions: string[], mimeTypes: string[]}}}
   */
  static get pasteConfig() {
    return {
      /**
       * Paste HTML into Editor
       */
      tags: ['img'],

      /**
       * Paste URL of image into the Editor
       */
      patterns: {
        image: /https?:\/\/\S+\.(gif|jpe?g|tiff|png)$/i,
      },

      /**
       * Drag n drop file from into the Editor
       */
      files: {
        mimeTypes: ['image/*'],
      },
    };
  }

  /**
   * Specify paste handlers
   *
   * @public
   * @see {@link https://github.com/codex-team/editor.js/blob/master/docs/tools.md#paste-handling}
   * @param {CustomEvent} event - editor.js custom paste event
   *                              {@link https://github.com/codex-team/editor.js/blob/master/types/tools/paste-events.d.ts}
   * @returns {void}
   */
  async onPaste(event) {
    switch (event.type) {
      case 'tag': {
        const image = event.detail.data;

        /** Images from PDF */
        if (/^blob:/.test(image.src)) {
          const response = await fetch(image.src);
          const file = await response.blob();

          this.uploadFile(file);
          break;
        }

        this.uploadUrl(image.src);
        break;
      }
      case 'pattern': {
        const url = event.detail.data;

        this.uploadUrl(url);
        break;
      }
      case 'file': {
        const file = event.detail.file;

        this.uploadFile(file);
        break;
      }
    }
  }

  /**
   * Create Image block
   * @public
   *
   * @param {string} url - url of saved or upload image
   * @param {string} caption - caption of image
   *
   * Structure
   * <item>
   *  <url/>
   *  <removeButton/>
   *  <img/>
   *  <caption>
   * </item>
   *
   * @return {HTMLDivElement}
   */
  creteNewItem(url, caption) {
    // Create item, remove button and field for image url
    const block = make('div', [ this.CSS.block ]);
    const item = make('div', [ this.CSS.item ]);
    const removeBtn = make('div', [ this.CSS.removeBtn ]);
    const imageUrl = make('input', [ this.CSS.inputUrl ],{ 'data-encode': this.encodeFile });
    const imagePreloader = make('div', [ this.CSS.imagePreloader ]);

    imageUrl.value = url;

    removeBtn.innerHTML = this.IconClose;
    removeBtn.addEventListener('click', () => {
      block.remove();
    });
    removeBtn.style.display = 'none';

    if (!this.readOnly) {
      item.appendChild(imageUrl);
      item.appendChild(removeBtn);
    }
    block.appendChild(item);
    /*
     * If data already yet
     * We create Image view
     */
    if (url) {
      this._createImage(url, item, caption, removeBtn);
    } else {
      item.appendChild(imagePreloader);
    }
    return block;
  }

  /**
   * Create Image View
   * @public
   *
   * @param {string} url - url of saved or upload image
   * @param {HTMLDivElement} item - block of created image
   * @param {string} captionText - caption of image
   * @param {HTMLDivElement} removeBtn - button for remove image block
   *
   * @return {HTMLDivElement}
   */
  _createImage(url, item, captionText, removeBtn) {
    const image = document.createElement('img');
    const caption = make('input', [this.CSS.caption, this.CSS.input]);
    if (this.readOnly) {
      caption.setAttribute('disabled', 'disabled');
    }

    image.src = url;
    if (captionText) {
      caption.value = captionText;
    }
    caption.placeholder = 'Caption...';

    removeBtn.style.display = 'flex';

    item.appendChild(image);
    item.appendChild(caption);
  }

  /**
   * File uploading callback
   * @private
   *
   * @param {Response} response
   */
  async onUpload(response) {
    if (response.success && response.files) {
      console.log(response.files.length);
      await new Promise(resolve => setTimeout(resolve, 1000));
      for (let i = 0; i < response.files.length; i++) {
        let file = response.files[response.files.length - 1 - i];
        // Берем последний созданный элемент и ставим изображение с сервера
        let lastElem = this.list.childNodes.length - (2 + i);
        this._createImage(file.url, this.list.childNodes[lastElem].firstChild, '', this.list.childNodes[lastElem].firstChild.childNodes[1]);
        this.list.childNodes[lastElem].firstChild.childNodes[2].style.backgroundImage = '';
        this.list.childNodes[lastElem].firstChild.firstChild.value = file.url;
        this.list.childNodes[lastElem].firstChild.classList.add('carousel-item--empty');
      }
    } else {
      this.uploadingFailed('incorrect response: ' + JSON.stringify(response));
    }
  }

  /**
   * Handle uploader errors
   * @private
   *
   * @param {string} errorText
   */
  uploadingFailed(errorText) {
    this.api.notifier.show({
      message: 'Can not upload an image, try another',
      style: 'error'
    });
  }

  /**
   * Shows uploading preloader
   * @param {string} src - preview source
   */
  showPreloader(src) {
    this.nodes.imagePreloader.style.backgroundImage = `url(${src})`;
  }

  // eslint-disable-next-line require-jsdoc
  onSelectFile() {
    if (this.encodeFile) {
      this.uploader.encodeSelectedFile({
        onPreview: (src, filename) => {
          const newItem = this.creteNewItem(src, '');
          newItem.firstChild.firstChild.setAttribute('data-name', filename);
          console.log(newItem.firstChild.firstChild);

          newItem.firstChild.classList.add('carousel-item--empty');
          this.list.insertBefore(newItem, this.addButton);
        }
      });
    } else {
      // Создаем элемент
      this.uploader.uploadSelectedFile({
        onPreview: (src) => {
          const newItem = this.creteNewItem('', '');
          newItem.firstChild.lastChild.style.backgroundImage = `url(${src})`;
          this.list.insertBefore(newItem, this.addButton);
        }
      });
    }
  }

  /**
   * Create add button
   * @private
   */
  createAddButton() {
    const addButton = make('div', [this.CSS.button, this.CSS.addButton]);
    const block = make('div', [ this.CSS.block ]);

    addButton.innerHTML = `${buttonIcon} Add Image`;
    addButton.addEventListener('click', () => {
      this.onSelectFile();
    });
    if (!this.readOnly) {
      block.appendChild(addButton);
    }

    return block;
  }
}

/**
 * Helper for making Elements with attributes
 *
 * @param  {string} tagName           - new Element tag name
 * @param  {array|string} classNames  - list or name of CSS class
 * @param  {Object} attributes        - any attributes
 * @return {Element}
 */
export const make = function make(tagName, classNames = null, attributes = {}) {
  const el = document.createElement(tagName);

  if (Array.isArray(classNames)) {
    el.classList.add(...classNames);
  } else if (classNames) {
    el.classList.add(classNames);
  }

  for (const attrName in attributes) {
    el.setAttribute(attrName, attributes[attrName]);
  }

  return el;
};
