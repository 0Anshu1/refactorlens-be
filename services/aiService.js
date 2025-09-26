const { spawn } = require('child_process');

async function analyzeWithAI(codeSnippets) {
  return new Promise((resolve, reject) => {
    const py = spawn('python', ['ai/code_analyzer.py']);
    let output = '';
    let error = '';

    py.stdout.on('data', (data) => {
      output += data.toString();
    });
    py.stderr.on('data', (data) => {
      error += data.toString();
    });
    py.on('close', (code) => {
      if (code !== 0) {
        reject(new Error(error || 'Python process failed'));
      } else {
        try {
          resolve(JSON.parse(output));
        } catch (e) {
          reject(e);
        }
      }
    });
    py.stdin.write(JSON.stringify(codeSnippets));
    py.stdin.end();
  });
}

module.exports = { analyzeWithAI };
