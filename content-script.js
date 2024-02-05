/* globals chrome, CodeMirror, js_beautify, css_beautify, unpacker_filter */

function getType() {
    let ext;

    console.log('document.contentType', document.contentType);

    Object.entries(MODE_LANGUAGE_MAP).some(([type, { types }]) => {
        if (types.includes(document.contentType)) {
            ext = type;
            return true;
        } else {
            return false;
        }
    });

    if (!ext) {
        const extList = Object.keys(MODE_LANGUAGE_MAP);

        console.log('location.pathname', location.pathname);

        ext = location.pathname.split('.').pop();

        if (!extList.includes(ext)) {
            console.log('location.search', location.search);

            ext = Array.from(new URLSearchParams(location.search).values()).find(value => extList.includes(value));
        }

        if (!ext) return;
    }

    return ext;
}

function CodeBeautifier(ext, options) {
    const body = document.body;
    const sourcePre = body.firstChild;
    let code = sourcePre.textContent;
    const lang = MODE_LANGUAGE_MAP[ext].name;
    const mode = MODE_LANGUAGE_MAP[ext].types[0];
    let start;

    console.group('[Code Beautifier] File Type: ' + lang);
    console.log('Options:', options);

    function bindEvents() {
        let activeline;

        function removeActiveline() {
            if (activeline) {
                activeline.classList.remove('CodeMirror-activeline', 'CodeMirror-activeline-background');
                activeline.cells[0].classList.add('CodeMirror-activeline-gutter');
                activeline = null;
            }
        }

        document.addEventListener('click', function(event) {
            const tr = event.target.closest('tr');

            if (!tr || window.getSelection().toString()) return;

            removeActiveline();

            tr.classList.add('CodeMirror-activeline', 'CodeMirror-activeline-background');
            tr.cells[0].classList.add('CodeMirror-activeline-gutter');

            activeline = tr;
        }, false);

        document.addEventListener('dblclick', removeActiveline, false);

        document.addEventListener('selectstart', removeActiveline, false);
    }

    function beautify() {
        body.classList.add('processing');

        Array.from(shadow.children).forEach((el) => {
            if (el.nodeName !== 'LINK') shadow.removeChild(el);
        });
        const text = document.createElement('span');
        text.textContent = 'Beautify…';
        shadow.appendChild(text);

        start = window.performance.now();
        console.time('Total');
        console.time('Format');

        if (typeof css_beautify === 'function') {
            if (mode !== 'text/x-sass') code = css_beautify(code, options);
        } else if (typeof js_beautify === 'function') {
            if (mode === 'text/jsx') options.e4x = true;
            code = js_beautify(options.detect_packers ? unpacker_filter(code) : code, options);
        }

        console.timeEnd('Format');
        console.time('Highlight');

        const cmWrapper = document.createElement('div');
        cmWrapper.className = `CodeMirror CodeMirror-wrap cm-s-${options.theme.split(' ').join(' cm-s-')}`;
        if (options.font !== 'default') cmWrapper.style.fontFamily = `"${options.font}", monospace`;

        const cmLines = document.createElement('div');
        cmLines.className = 'CodeMirror-lines';

        const cmCode = document.createElement('table');
        cmCode.className = 'CodeMirror-code';

        const colGroup = document.createElement('colgroup');
        const colNumber = document.createElement('col');
        const colContent = document.createElement('col');

        colNumber.className = 'line-number';
        colContent.className = 'line-content';
        colGroup.appendChild(colNumber);
        colGroup.appendChild(colContent);
        cmCode.appendChild(colGroup);

        const cmGutters = document.createElement('div');
        cmGutters.className = 'CodeMirror-gutters';
        cmGutters.innerHTML = '<div class="CodeMirror-gutter CodeMirror-linenumbers"><div class="CodeMirror-linenumber"></div></div>';

        const tabSize = options.indent_size;
        const tabChar = options.indent_char;
        let col = 0;

        let lineNumber = 0;
        let frag = document.createDocumentFragment();
        let row, lineNumCell, lineNumEl, lineCntCell, pre;

        function appendLine(contents) {
            lineNumber++;

            row = cmCode.insertRow();

            lineNumCell = row.insertCell(0);
            lineNumCell.className = 'CodeMirror-gutter-wrapper';

            lineNumEl = document.createElement('div');
            lineNumEl.dataset.n = lineNumber;
            lineNumEl.className = 'CodeMirror-linenumber CodeMirror-gutter-elt';
            lineNumCell.appendChild(lineNumEl);

            lineCntCell = row.insertCell(1);
            lineCntCell.className = 'CodeMirror-pre-wrapper';

            if (contents.childNodes.length !== 0) {
                pre = document.createElement('pre');
                pre.className = 'CodeMirror-line';
                pre.appendChild(contents);
                lineCntCell.appendChild(pre);
            }

            frag = document.createDocumentFragment();
        }

        CodeMirror.runMode(code, mode, function(text, style) {
            if (text == '\n') {
                appendLine(frag);
                col = 0;
                return;
            }
            let content = '';
            // replace tabs
            for (let pos = 0;;) {
                const idx = text.indexOf('\t', pos);
                if (idx == -1) {
                    content += text.slice(pos);
                    col += text.length - pos;
                    break;
                } else {
                    col += idx - pos;
                    content += text.slice(pos, idx);
                    const size = tabSize - col % tabSize;
                    col += size;
                    for (let i = 0; i < size; ++i) content += tabChar;
                    pos = idx + 1;
                }
            }

            if (style) {
                const sp = document.createElement('span');
                sp.className = `cm-${style.replace(/ +/g, ' cm-')}`;
                sp.appendChild(document.createTextNode(content));
                frag.appendChild(sp);
            } else {
                frag.appendChild(document.createTextNode(content));
            }
        });
        appendLine(frag);

        cmGutters.querySelector('.CodeMirror-linenumber').dataset.n = lineNumber;
        cmWrapper.appendChild(cmGutters);
        cmLines.appendChild(cmCode);
        cmWrapper.appendChild(cmLines);

        console.timeEnd('Highlight');

        const theme = options.theme.split(' ')[0];

        (theme === 'default'
            ? Promise.resolve(console.log('Insert Theme: skip default theme'))
            : new Promise((resolve) => {
                console.time('Insert Theme');
                chrome.runtime.sendMessage({
                    action: 'insert_theme',
                    theme,
                }, function() {
                    console.timeEnd('Insert Theme');
                    resolve();
                });
            })
        ).then(() => {
            body.removeChild(sourcePre);
            body.appendChild(cmWrapper);
            body.classList.remove('showCbBar', 'autoformat', 'processing');
            body.classList.add('CodeBeautifier');

            const gutterOuterWidth = cmGutters.offsetWidth;
            const gutterInnerWidth = cmGutters.querySelector('.CodeMirror-linenumbers').offsetWidth;
            colNumber.style.width = `${gutterOuterWidth}px`;

            console.time('Insert CSS');
            chrome.runtime.sendMessage({
                action: 'insert_css',
                css: `.CodeMirror-code .CodeMirror-linenumber { margin-right: ${(gutterOuterWidth - gutterInnerWidth) / 2}px }`
            }, function() {
                console.timeEnd('Insert CSS');
                console.timeEnd('Total');
                console.groupEnd();

                chrome.runtime.sendMessage({
                    action: 'beautify',
                    type: lang,
                    duration: (window.performance.now() - start).toFixed()
                });

                bindEvents();
            });
        });
    }

    const bar = document.createElement('div');
    bar.id = 'cbBar';

    const shadow = bar.attachShadow({ mode: 'closed' });
    const css_link = document.createElement('link');
    css_link.rel = 'stylesheet';
    css_link.href = chrome.runtime.getURL('cb-bar.css');
    shadow.appendChild(css_link);

    const bar_text = document.createElement('span');
    bar_text.className = 'desc';

    if (options.autoformat) {
        bar_text.textContent = 'Beautify…';
        shadow.appendChild(bar_text);
    } else {
        bar_text.textContent = `This looks like a ${lang} file.`;

        const btn_yes = document.createElement('button');
        btn_yes.textContent = 'Beautify Now!';
        btn_yes.onclick = function() {
            beautify();
        };

        const btn_no = document.createElement('button');
        btn_no.textContent = 'No, thanks.';

        const btn_close = document.createElement('button');
        btn_close.className = 'close';
        btn_close.innerHTML = '<span></span>';

        btn_no.onclick = btn_close.onclick = function() {
            body.className = '';
            chrome.runtime.sendMessage({
                action: 'reject',
                type: lang
            });
            console.groupEnd();
        };

        shadow.appendChild(bar_text);
        shadow.appendChild(btn_yes);
        shadow.appendChild(btn_no);
        shadow.appendChild(btn_close);
    }

    body.append(bar);

    bar.addEventListener('transitionEnd', function() {
        if (body.classList.contains('CodeBeautifier') || body.className === '') body.removeChild(bar);
    }, false);

    if (options.autoformat) {
        body.classList.add('autoformat');
        setTimeout(beautify, 200);
        chrome.runtime.sendMessage({
            action: 'autoformat',
            type: lang
        });
    } else {
        body.classList.add('showCbBar');
    }
}

if (document.body.firstChild.tagName === 'PRE') {
    chrome.runtime.sendMessage({
        action: 'get_options'
    }, function(options) {
        if (!options) throw new Error('Failed to load options.');

        const type = getType(options);

        if (!type) return;
        if (options.exclude_json && type === 'json') return;

        chrome.runtime.sendMessage({
            action: 'found',
            type: MODE_LANGUAGE_MAP[type].name,
        });

        chrome.runtime.sendMessage({
            action: 'insert_base_css',
        }, function() {
            chrome.runtime.sendMessage({
                action: 'insert_scripts',
                type,
            }, function() {
                CodeBeautifier(type, options);
            });
        });
    });
}
