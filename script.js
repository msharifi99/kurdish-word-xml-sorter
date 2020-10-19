import { parse } from 'node-html-parser';

const OO_LETTER = 'وو';
const kurdishLettersOrder = {
  ئ: 0,
  ا: 1,
  ب: 2,
  پ: 3,
  ت: 4,
  ج: 5,
  چ: 6,
  ح: 7,
  خ: 8,
  د: 9,
  ر: 10,
  ڕ: 11,
  ز: 12,
  ژ: 13,
  س: 14,
  ش: 15,
  ع: 16,
  غ: 17,
  ف: 18,
  ڤ: 19,
  ق: 20,
  ک: 21,
  گ: 22,
  ل: 23,
  ڵ: 24,
  م: 25,
  ن: 26,
  و: 27,
  ۆ: 28,
  [OO_LETTER]: 29,
  ه: 30,
  ە: 31,
  ی: 32,
  ێ: 33,
};

const stepDescriptor = () => ({ value: null, error: false, loading: false });

function createUpdateDOMProxy(target) {
  if (target === null || typeof target !== 'object') return;
  const deepProxyObject = {};
  Object.keys(target).forEach((key) => {
    const val = target[key];
    if (Array.isArray(val)) {
      const proxyArray = val.map(createUpdateDOMProxy);
      deepProxyObject[key] = proxyArray;
      return;
    }
    if (typeof val === 'object') {
      deepProxyObject[key] = createUpdateDOMProxy(val);
      return;
    }
    deepProxyObject[key] = val;
  });
  return new Proxy(deepProxyObject, {
    set(obj, prop, val) {
      obj[prop] = val;
      updateDOM();
    },
  });
}

const sourceState = {
  upload: stepDescriptor(),
  process: stepDescriptor(),
  download: stepDescriptor(),
};

const state = createUpdateDOMProxy(sourceState);
function updateDOM() {
  updateButtons();
  updateStepsStatus();
}

const buttons = {
  upload: document.querySelector('.kurdish-sorter__upload'),
  process: document.querySelector('.kurdish-sorter__process'),
  download: document.querySelector('.kurdish-sorter__download'),
};

function updateButtons() {
  updateProcessButton();
  updateDownloadButton();
}

function updateProcessButton() {
  const { process } = buttons;
  const { upload } = state;
  if (!upload.value) {
    process.disabled = true;
    return;
  }
  process.disabled = false;
}

function updateDownloadButton() {
  const { download } = buttons;
  const { upload, process } = state;
  if (!upload.value || !process.value) {
    download.disabled = true;
    return;
  }
  download.disabled = false;
}

const status = {
  upload: document.querySelector('.kurdish-sorter__upload-status'),
  process: document.querySelector('.kurdish-sorter__process-status'),
  download: document.querySelector('.kurdish-sorter__download-status'),
};

function updateStepsStatus() {
  updateUploadState();
  updateProcessState();
  updateDownloadState();
}

function updateUploadState() {
  const { upload } = status;
  const { upload: uploadDescriptor } = state;
  resetStatusElement(upload);
  if (uploadDescriptor.error) {
    setErrorStatus(upload, 'UPLOAD FAIL');
  } else if (uploadDescriptor.loading) {
    setProcessingStatus(upload, 'UPLOADING...');
  } else if (uploadDescriptor.value) {
    setNormalStatus(upload, 'UPLOADED');
  }
}

function updateProcessState() {
  const { process } = status;
  const { process: processDescriptor } = state;
  resetStatusElement(process);
  if (processDescriptor.error) {
    setErrorStatus(process, 'PROCESS FAIL');
  } else if (processDescriptor.loading) {
    setProcessingStatus(process, 'PROCESSING...');
  } else if (processDescriptor.value) {
    setNormalStatus(process, 'PROCESSED');
  }
}

function updateDownloadState() {
  const { download } = status;
  const { download: downloadDescriptor, process: processDescriptor } = state;
  resetStatusElement(download);
  if (downloadDescriptor.error) {
    setErrorStatus(download, 'FILE CREATION FAIL');
  } else if (downloadDescriptor.loading) {
    setProcessingStatus(download, 'CREATING FILE...');
  } else if (downloadDescriptor.value) {
    setNormalStatus(download, 'DOWNLOADED');
  }
}

function resetStatusElement(el) {
  if (!el) return;
  el.style.display = 'none';
  el.classList.remove('order-list-item__status--error');
  el.classList.remove('order-list-item__status--processing');
}

function prepareStatusElement(el) {
  resetStatusElement(el);
  el.style.display = 'initial';
}

function setErrorStatus(el, text) {
  prepareStatusElement(el);
  el.classList.add('order-list-item__status--error');
  el.innerHTML = text;
}

function setProcessingStatus(el, text) {
  prepareStatusElement(el);
  el.classList.add('order-list-item__status--processing');
  el.innerHTML = text;
}

function setNormalStatus(el, text) {
  prepareStatusElement(el);
  el.innerHTML = text;
}

function sortOoXMLParagraphs(ooXML) {
  console.log('PROCESSING');
  const dom = parse(ooXML);
  const body = dom.querySelector('w:body');
  const paragraphs = body.querySelectorAll('w:p');
  const descriptors = getParagraphDescriptorList(paragraphs);
  sortDescriptors(descriptors);
  const sortedParagraphs = syncParagraphsWithDescriptors(
    paragraphs,
    descriptors
  );
  replaceNodeChildren(body, sortedParagraphs);
  return dom.toString();
}

function getParagraphDescriptorList(paragraphs) {
  return paragraphs.map((paragraph, index) => ({
    index,
    text: normalizeText(getTextFromParagraph(paragraph)),
  }));
}

function normalizeText(text) {
  return text.trim().split('ـ').join('');
}

function getTextFromParagraph(paragraphNode) {
  const wordTextNodes = paragraphNode.querySelectorAll('w:t');
  const textNode = wordTextNodes.map(({ childNodes }) => childNodes[0]);
  const text = textNode.map(({ rawText }) => rawText).join('');
  return text;
}

function sortDescriptors(descriptors) {
  descriptors.sort((b, a) => {
    const { text: textB } = b;
    const { text: textA } = a;
    return compare(textB, textA);
  });
  return descriptors;
}

function compare(secondLine, firstLine) {
  const transformedSecondLine = str2CharNumber(secondLine);
  const transformedFirsLine = str2CharNumber(firstLine);
  const isBothLineArray =
    Array.isArray(transformedFirsLine) && Array.isArray(transformedSecondLine);
  if (isBothLineArray)
    return compareTwoArray(transformedFirsLine, transformedSecondLine);

  if (firstLine > secondLine) return -1;
  if (secondLine > firstLine) return 1;
  return 0;
}

function str2CharNumber(str) {
  let result = str;
  result = result.replaceAll(OO_LETTER, kurdishLettersOrder[OO_LETTER] + ' ');
  Object.keys(kurdishLettersOrder).forEach((char) => {
    result = result.replaceAll(char, kurdishLettersOrder[char] + ' ');
  });
  return result.split(' ').map((a) => Number(a));
}

function compareTwoArray(arr1, arr2) {
  for (let i = 0; i < arr1.length; i++) {
    if (arr1[i] === arr2[i]) continue;
    if (arr1[i] > arr2[i]) return -1;
    if (arr2[i] > arr1[i]) return 1;
  }
  if (arr1.length > arr2.length) return -1;
  if (arr2.length > arr1.length) return 1;
  if (arr2.length === arr1.length) return 0;
}

function syncParagraphsWithDescriptors(paragraphs, descriptors) {
  return descriptors.map(({ index }) => paragraphs[index]);
}

function replaceNodeChildren(node, newChildren) {
  const oldChildren = [...node.childNodes];
  for (const child of oldChildren) {
    node.removeChild(child);
  }
  for (const child of newChildren) {
    node.appendChild(child);
  }
  return node;
}

function readXMLFile(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsText(file);
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(reader.error);
  });
}

function readAndProcessXML() {
  if (!state.upload.value) {
    console.error('NO_FILE');
    state.process.error = true;
    return;
  }
  state.process.loading = true;
  readXMLFile(state.upload.value)
    .then(sortOoXMLParagraphs)
    .then((XML) => {
      state.process.value = XML;
      state.process.loading = false;
    })
    .catch((e) => {
      console.error('PROCESSING_FAIL', e);
      state.process.error = true;
    })
    .finally(() => {
      state.process.loading = false;
    });
}

function downloadProcessedFile() {
  state.download.loading = true;
  try {
    const file = new Blob([state.process.value], { type: 'text/xml' });
    const fileUrl = URL.createObjectURL(file);
    const downloaderLink = document.createElement('a');
    downloaderLink.href = fileUrl;
    downloaderLink.download = state.upload.value.name;
    downloaderLink.click();
    state.download.value = file;
  } catch (e) {
    state.download.error = true;
    console.log('FILE CREATION FAILED', e);
  } finally {
    state.download.loading = false;
  }
}

const uploadInput = document.querySelector('.kurdish-sorter__upload-input');

function bindUploadButtonClickEventToUploadInputClick() {
  buttons.upload.addEventListener('click', () => uploadInput.click());
}

function bindXMLFileToUploadInputChangeEvent() {
  uploadInput.addEventListener('change', (event) => {
    const files = event.target.files;
    if (!files.length) {
      console.error('NO_FILE_SELECTED');
      state.upload.error = true;
      return;
    }
    state.upload.value = files[0];
  });
}

function bindXMLProcessorToProcessButtonClick() {
  buttons.process.addEventListener('click', readAndProcessXML);
}

function bindDownloadFunctionToDownloadButtonClick() {
  buttons.download.addEventListener('click', downloadProcessedFile);
}

function initialize() {
  bindUploadButtonClickEventToUploadInputClick();
  bindXMLFileToUploadInputChangeEvent();
  bindXMLProcessorToProcessButtonClick();
  bindDownloadFunctionToDownloadButtonClick();
  updateDOM({});
}

initialize();
