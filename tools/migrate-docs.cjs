const TurnDown = require('turndown');
const fs = require('fs');

const htmlContent = fs.readFileSync('./tools/backbonejs.html', { encoding: 'utf-8' });
const turnDown = new TurnDown({ codeBlockStyle: 'fenced', headingStyle: 'atx' });

turnDown.remove(node => {
  return node.matches('#sidebar');
});

turnDown.remove(['style', 'table']);

turnDown.addRule('precode', {
  filter: ['pre'],
  replacement: function(content, node) {
    return '```js\n' + node.textContent.trim() + '\n```';
  }
});

turnDown.addRule('bheader', {
  filter: node => {
    return node.matches('b.header');
  },
  replacement: function(content) {
    return '### ' + content + '\n';
  }
});

const markDown = turnDown.turndown(htmlContent);

fs.writeFileSync('./tools/backbonejs.md', markDown);
