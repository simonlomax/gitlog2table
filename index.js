#!/usr/bin/env node

import clipboard from 'clipboardy';
import child_process from 'child_process';
import { input, confirm, select } from '@inquirer/prompts';
import ora from 'ora';
import { marked } from 'marked';
import TerminalRenderer from 'marked-terminal';

marked.setOptions({
  renderer: new TerminalRenderer()
});

const subprocess = child_process;
try {
  const confirmation = await confirm({ message: "This command will git pull when executed. Is this ok?" });

  if (!confirmation) {
    console.log('Exiting...');
    process.exit(1);
  }
  const args = {
    location: await input({ message: "Enter path to project directory:" }),
    repoName: await input({ message: "Enter name of repository:" }),
    providerName: await select({
      message: "Select a git provider:",
      choices: [
        {
          name: 'GitHub',
          value: 'github'
        },
        {
          name: 'BitBucket',
          value: 'bitbucket'
        },
        {
          name: 'Other/None',
          value: 'other'
        }
      ]
    }),
    orgName: await input({ message: "Enter user/org name (or N/A):" }),
    hashStart: await input({ message: "Enter starting commit hash:" }),
    hashEnd: await input({ message: "Enter ending commit hash (or HEAD for latest):" })
  }

  args.hashEnd === "" ? "HEAD" : args.hashEnd;
  const pullExec = `cd ${args.location} && git pull`
  const logExec = `cd ${args.location} && git log --pretty=format:'%H|%s|%an' ${args.hashStart}..${args.hashEnd}`;
  const spinner = ora("Processing...").start();
  try {
    const result = await startProcess(pullExec, logExec, args.providerName, args.repoName, args.orgName);
    spinner.succeed(result.msg);
    console.log(marked.parse(result.markdown));
  } catch (err) {
    spinner.fail(err);
  }

} catch (error) {
  if (error.name === "ExitPromptError") {
    console.log("Exiting");
    process.exit(1);
  }
}

function startProcess(pullExec, logExec, provider, repo, org) {
  return new Promise((resolve, reject) => {

    let exec = subprocess.exec(pullExec, (err, stdout, stderr) => {

      const out = stdout.toLowerCase();
      const errout = stderr.toLowerCase();
      if (err) {
        reject("Error pulling git, make sure directory is correct and there are no conflicts/errors.")
      }
      if (out.includes('conflict') || errout.includes('conflict')) {
        reject('Merge conflict detected. Aborting.')
      }
      subprocess.exec(logExec, (err, stdout, stderr) => {
        if (err) {
          reject('Logging error. Check hashes to ensure they are correct.');
        }
        if (stdout.toString() === undefined || stdout.toString() === "") {
          reject('Logging returned zero results. Check your hashes to make sure they are correct.');
        }
        let lines = stdout.toString().split('\n');
        let markdown = '||**Hash**|**Description**|**Author**|\n|---|---|---|---|\n';
        for (let i = 0; i < lines.length; i++) {
          let line = lines[i].split('|');
          let hashLine = line[0].slice(0, 5);
          if (provider === "github") {
            hashLine = `[${line[0].slice(0, 5)}](https://github.com/${org}/${repo}/commit/${line[0]})`;
          }
          else if (provider === "bitbucket") {
            hashLine = `[${line[0].slice(0, 5)}](https://bitbucket.org/${org}/${repo}/commits/${line[0]})`;
          }

          markdown += '|' + (lines.length - i) + '|' + hashLine + '|' + line[1] + '|' + line[2] + '|\n';
        }
        clipboard.writeSync(markdown);
        let result = {
          "msg": "Table copied to clipboard",
          "markdown": markdown
        }
        resolve(result);
      });
    });
  })
}

