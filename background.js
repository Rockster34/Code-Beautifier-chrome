/* globals chrome */

import MODE_LANGUAGE_MAP from './types.module.js';

const defaults = {
    'autoformat': false,
    'exclude_json': false,
    'theme': 'default',
    'font': 'default',
    'end_with_newline': false,

    'indent_size': 4,
    'indent_char': ' ',

    'preserve_newlines': true,
    'max_preserve_newlines': 10,
    'wrap_line_length': 0,
    'brace_style': 'collapse',
    'e4x': false,
    'comma_first': false,
    'detect_packers': true,
    'keep_array_indentation': false,
    'break_chained_methods': false,
    'space_before_conditional': true,
    'unescape_strings': false,
    'jslint_happy': false,

    'selector_separator_newline': true,
    'newline_between_rules': true,
    'space_around_selector_separator': true
};
let options = null;
let uid = 'guest';

function updateOptions() {
    return new Promise((resolve, reject) => {
        chrome.storage.sync.get('options', function(data) {
            if (chrome.runtime.lastError) {
                return reject(chrome.runtime.lastError);
            }

            options = Object.assign(defaults, data.options);

            resolve(options);
        });
    });
}

function getRandomToken() {
    const randomPool = new Uint8Array(32);
    crypto.getRandomValues(randomPool);
    let hex = '';
    for (let i = 0; i < randomPool.length; ++i) {
        hex += randomPool[i].toString(16);
    }
    return hex;
}

chrome.storage.onChanged.addListener(function(changes, areaName) {
    console.info('chrome.storage.onChanged', changes, areaName);
    updateOptions();
});

chrome.runtime.onMessage.addListener(function(message, sender, sendResponse) {
    const tabId = sender.tab ? sender.tab.id : null;

    switch (message.action) {
        case 'get_options':
            if (options) {
                sendResponse(options);
            } else {
                updateOptions().then(sendResponse);
            }
            return true;
        case 'found':
            break;
        case 'beautify':
            break;
        case 'insert_scripts':
            const files = ['codemirror/addon/runmode/runmode-standalone.js', 'utils.js'];

            if (['js', 'ts', 'json'].includes(message.type)) {
                files.push(
                    'codemirror/mode/javascript/javascript.js',
                    'jsbeautify/beautify.js',
                    'jsbeautify/unpackers/javascriptobfuscator_unpacker.js',
                    'jsbeautify/unpackers/myobfuscate_unpacker.js',
                    'jsbeautify/unpackers/p_a_c_k_e_r_unpacker.js',
                    'jsbeautify/unpackers/urlencode_unpacker.js',
                );
            } else if (message.type === 'jsx') {
                files.push(
                    'codemirror/mode/javascript/javascript.js',
                    'codemirror/mode/xml/xml.js',
                    'codemirror/mode/jsx/jsx.js',
                    'jsbeautify/beautify.js',
                    'jsbeautify/unpackers/javascriptobfuscator_unpacker.js',
                    'jsbeautify/unpackers/myobfuscate_unpacker.js',
                    'jsbeautify/unpackers/p_a_c_k_e_r_unpacker.js',
                    'jsbeautify/unpackers/urlencode_unpacker.js',
                );
            } else if (['css', 'less', 'scss'].includes(message.type)) {
                files.push(
                    'codemirror/mode/css/css.js',
                    'jsbeautify/beautify-css.js',
                );
            } else if (message.type === 'sass') {
                files.push(
                    'codemirror/mode/sass/sass.js',
                    'jsbeautify/beautify-css.js',
                );
            } else if (message.type === 'md') {
                files.push(
                    'codemirror/mode/xml/xml.js',
                    'codemirror/mode/markdown/markdown.js',
                );
            }

            chrome.scripting.executeScript({
                target: { tabId },
                files,
            }, sendResponse);
            return true;
        case 'insert_base_css':
            chrome.scripting.insertCSS({
                target: { tabId },
                files: ['codemirror/lib/codemirror.css', 'content-script.css']
            }, sendResponse);
            return true;
        case 'insert_theme':
            chrome.scripting.insertCSS({
                target: { tabId },
                files: [`codemirror/theme/${message.theme}.css`]
            }, sendResponse);
            return true;
        case 'insert_css':
            chrome.scripting.insertCSS({
                target: { tabId },
                css: message.css
            }, sendResponse);
            return true;
    }
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
    if (changeInfo.status === 'complete') {
        chrome.scripting.executeScript({
            target: { tabId },
            func: () => document.contentType,
        }, (result) => {
            if (!result) return;

            const contentType = result[0].result;

            console.log('tabs.onUpdated', tabId, tab.url, contentType);

            if (Object.values(MODE_LANGUAGE_MAP).some(({ types }) => types.includes(contentType)) || contentType === 'text/plain') {
                chrome.scripting.executeScript({
                    target: { tabId },
                    files: ['types.js', 'content-script.js'],
                });
            }
        });
    }
});

chrome.storage.sync.get('uid', function(data) {
    if (data.uid) {
        uid = data.uid;
    } else {
        uid = getRandomToken();
        chrome.storage.sync.set({ uid });
    }
});

updateOptions();
