/* globals chrome, CodeMirror, js_beautify, css_beautify, unpacker_filter */

var main = document.getElementById('main');
var preview = document.getElementById('preview');
var sampleJS = document.getElementById('sample-js').value;
var sampleJSX = document.getElementById('sample-jsx').value;
var sampleCSS = document.getElementById('sample-css').value;
var themeCSS = document.getElementById('theme');
var form = document.getElementById('options');
var selectboxList = ['max_preserve_newlines', 'wrap_line_length', 'brace_style'];
var checkboxList = ['end_with_newline', 'e4x', 'comma_first', 'detect_packers', 'keep_array_indentation', 'break_chained_methods', 'space_before_conditional', 'unescape_strings', 'jslint_happy', 'selector_separator_newline', 'newline_between_rules', 'space_around_selector_separator'];
var lang = 'javascript';
var options = {};
var cm;

function beautify() {
    var code;

    if (lang === 'css') {
        code = css_beautify(sampleCSS, options);
    } else {
        code = options.e4x ? sampleJSX : sampleJS;
        code = js_beautify(options.detect_packers ? unpacker_filter(code) : code, options);
    }

    if (cm) preview.removeChild(cm.getWrapperElement());
    cm = CodeMirror(preview, {
        value: code,
        mode: lang,
        theme: options.theme,
        lineNumbers: true,
        readOnly: true
    });
    themeCSS.href = `codemirror/theme/${options.theme.split(' ')[0]}.css`;
    if (options.font !== 'default') cm.getWrapperElement().style.fontFamily = `"${options.font}", monospace`;

    setTimeout(function() {
        main.style.marginBottom = `${preview.getBoundingClientRect().height + 10}px`;
    }, 50);
}

function saveOptions() {
    options.autoformat = form.autoformat.checked;
    options.exclude_json = form.exclude_json.checked;
    options.theme = form.theme.value;
    options.font = form.font.value;
    options.indent_size = form.indent_size.value;
    options.indent_char = options.indent_size == 1 ? '\t' : ' ';

    selectboxList.forEach(function(field) {
        options[field] = form[field].value;
    });

    checkboxList.forEach(function(field) {
        options[field] = form[field].checked;
    });

    if (['selector_separator_newline', 'newline_between_rules', 'space_around_selector_separator'].indexOf(this.name) > -1) {
        lang = 'css';
    }

    beautify();

    chrome.storage.sync.set({ options: options }, function() {
        console.log('Options saved.');
    });
}

chrome.runtime.sendMessage({ action: 'get_options' }, function (_options) {
    options = _options;

    form.autoformat.checked = options.autoformat;
    form.exclude_json.checked = options.exclude_json;
    form.theme.value = options.theme;
    form.font.value = options.font;
    form.indent_size.value = options.indent_size;

    selectboxList.forEach(function(field) {
        form[field].value = options[field];
    });

    checkboxList.forEach(function(field) {
        form[field].checked = options[field];
    });

    Array.prototype.slice.call(form.querySelectorAll('input, select')).forEach(function(field) {
        field.onchange = function() {
            preview.dataset[field.name] = field.type === 'checkbox' ? field.checked : field.value;

            saveOptions();
        };

        preview.dataset[field.name] = field.type === 'checkbox' ? field.checked : field.value;
    });

    beautify();
});
