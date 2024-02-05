/* globals P_A_C_K_E_R, Urlencoded, JavascriptObfuscator, MyObfuscate */

function unpacker_filter(source) {
  var leading_comments = '',
    comment = '',
    unpacked = '',
    found = false;

  // cuts leading comments
  do {
    found = false;
    if (/^\s*\/\*/.test(source)) {
      found = true;
      comment = source.substr(0, source.indexOf('*/') + 2);
      source = source.substr(comment.length);
      leading_comments += comment;
    } else if (/^\s*\/\//.test(source)) {
      found = true;
      comment = source.match(/^\s*\/\/.*/)[0];
      source = source.substr(comment.length);
      leading_comments += comment;
    }
  } while (found);
  leading_comments += '\n';
  source = source.replace(/^\s+/, '');

  var unpackers = [P_A_C_K_E_R, Urlencoded, JavascriptObfuscator /*, MyObfuscate*/ ];
  for (var i = 0; i < unpackers.length; i++) {
    if (unpackers[i].detect(source)) {
      unpacked = unpackers[i].unpack(source);
      if (unpacked !== source) {
        source = unpacker_filter(unpacked);
      }
    }
  }

  return leading_comments + source;
}
