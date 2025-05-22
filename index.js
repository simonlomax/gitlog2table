import clipboard from 'clipboardy';
import child_process from 'child_process';
import { input, confirm } from '@inquirer/prompts';

const confirmation = await confirm({ message: "This command will git pull when executed. Is this ok?" });

if (!confirmation) {
  console.log('Exiting...');
  process.exit(1);
}

const args = {
  location: await input({ message: "Enter path to project directory: " }),
  hashStart: await input({ message: "Enter starting commit hash: " }),
  hashEnd: await input({ message: "Enter ending commit hash (or ..HEAD for last): " })
}

args.hashEnd === "" ? "..HEAD" : args.hashEnd


const pullExec = `cd ${args.location} && git pull && git log --pretty=format:'%H|%s|%an' ${args.hashStart} ${args.hashEnd}`

//const logExec = `git log --pretty=format:'%H|%s|%argsn' ${args.hashStart} ${args.hashEnd}`; 

let exec = subprocess.exec(pullExec, (err, stdout, stderr) => {
  let lines = stdout.toString().split('\n');
  let markdown = '||**Hash**|**Description**|**Author**|\n|---|---|---|---|\n';
  for (let i = 0; i < lines.length; i++) {
    let line = lines[i].split('|');
    markdown += '|' + (lines.length - i) + '|' + line[0].slice(0, 5) + '|' + line[1] + '|' + line[2] + '|\n';
  }

  clipboard.writeSync(markdown);
  console.log('Table copied to clipboard');
})

