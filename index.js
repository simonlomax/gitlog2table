import clipboard from 'clipboardy';
import child_process from 'child_process';
import { input, confirm } from '@inquirer/prompts';
import ora from 'ora';

const subprocess = child_process;
try {
  const confirmation = await confirm({ message: "This command will git pull when executed. Is this ok?" });

  if (!confirmation) {
    console.log('Exiting...');
    process.exit(1);
  }
  const args = {
    location: await input({ message: "Enter path to project directory: " }),
    hashStart: await input({ message: "Enter starting commit hash: " }),
    hashEnd: await input({ message: "Enter ending commit hash (or HEAD for latest): " })
  }

  args.hashEnd === "" ? "HEAD" : args.hashEnd;
  const pullExec = `cd ${args.location} && git pull`
  const logExec = `cd ${args.location} && git log --pretty=format:'%H|%s|%an' ${args.hashStart}..${args.hashEnd}`;
  const spinner = ora("Processing...").start();
  try {
    const result = await startProcess(pullExec, logExec);
    spinner.succeed(result);
  } catch (err) {
    spinner.fail(err);
  }

} catch (error) {
  if (error.name === "ExitPromptError") {
    console.log("Exiting");
    process.exit(1);
  }
}

function startProcess(pullExec, logExec) {
  return new Promise((resolve, reject) => {

    let exec = subprocess.exec(pullExec, (err, stdout, stderr) => {
      if (stdout.toString() === undefined || stdout.toString() == "") {
        reject("Directory does not have git initiated. Please check that it is correct.");
      }
      subprocess.exec(logExec, (err, stdout, stderr) => {
        if (stdout.toString() === undefined || stdout.toString() === "") {
          reject('Logging returned zero results. Check your hashes to make sure they are correct.');
        }
        let lines = stdout.toString().split('\n');
        let markdown = '||**Hash**|**Description**|**Author**|\n|---|---|---|---|\n';
        for (let i = 0; i < lines.length; i++) {
          let line = lines[i].split('|');
          markdown += '|' + (lines.length - i) + '|' + line[0].slice(0, 5) + '|' + line[1] + '|' + line[2] + '|\n';
        }
        clipboard.writeSync(markdown);
        resolve('Table copied to clipboard');
      });
    });
  })
}

