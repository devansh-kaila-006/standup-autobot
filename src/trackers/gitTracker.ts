import * as vscode from 'vscode';
import { exec } from 'child_process';
import { promisify } from 'util';

// Promisify exec for async/await usage
const execAsync = promisify(exec);

/**
 * Represents the structure of a single commit as requested.
 */
export interface GitCommit {
  hash: string;
  timestamp: string;
  message: string;
  files: string[];
}

/**
 * GitTracker handles the retrieval of Git history for the current workspace.
 */
export class GitTracker {
  /**
   * Retrieves commits made by the current git user in the last specified hours.
   * 
   * @param hours The number of hours to look back (default 24).
   * @returns Promise<Array<GitCommit>> A list of commit objects.
   */
  public async getRecentCommits(hours: number = 24): Promise<GitCommit[]> {
    // 1. Ensure a workspace is open
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      console.warn('GitTracker: No workspace folder found.');
      return [];
    }

    const repoPath = workspaceFolder.uri.fsPath;

    try {
      // 2. Get the current Git user name
      const userName = await this.getGitUserName(repoPath);
      if (!userName) {
        return [];
      }

      // 3. Get raw Git log output
      // Format: "Hash|ISO-Timestamp|Message" followed by filenames on subsequent lines
      const formatString = '%H|%ai|%s';
      const command = `git log --author="${this.escapeShell(userName)}" --since="${hours} hours ago" --pretty=format:"${formatString}" --name-only`;
      
      const { stdout } = await execAsync(command, {
        cwd: repoPath,
        encoding: 'utf8'
      });

      // 4. Parse the output into structured JSON
      return this.parseGitLogOutput(stdout);

    } catch (error) {
      // 6. Error Handling
      // Check if it's a Git error (not a repo) or a system error
      if (error instanceof Error) {
        // Often 'git' commands fail with exit code 128 if not a repo
        if (error.message.includes('not a git repository')) {
          console.debug(`GitTracker: Folder "${repoPath}" is not a git repository.`);
        } else {
          console.error(`GitTracker: Error executing git command. ${error.message}`);
        }
      } else {
        console.error('GitTracker: An unknown error occurred.', error);
      }
      
      return [];
    }
  }

  /**
   * Helper to get the git user.name from the repository config.
   */
  private async getGitUserName(cwd: string): Promise<string | null> {
    try {
      const { stdout } = await execAsync('git config user.name', { cwd });
      return stdout.trim();
    } catch (error) {
      console.warn('GitTracker: Could not retrieve git user.name.');
      return null;
    }
  }

  /**
   * Helper to escape special characters in strings passed to the shell.
   * Prevents issues if the username contains quotes (e.g., O'Connor).
   */
  private escapeShell(str: string): string {
    return str.replace(/"/g, '\\"');
  }

  /**
   * Parses the raw text output from `git log` into an array of objects.
   * 
   * Expected raw format structure:
   * hash1|timestamp1|message1
   * file1.js
   * file2.ts
   * 
   * hash2|timestamp2|message2
   * file3.ts
   */
  private parseGitLogOutput(rawOutput: string): GitCommit[] {
    const commits: GitCommit[] = [];
    const lines = rawOutput.split(/\r?\n/);
    
    let currentCommit: Partial<GitCommit> | null = null;

    // Regex to identify the start of a commit block (Hash|Timestamp|Message)
    // Assumes Git hash is 40 hex characters
    const commitHeaderRegex = /^([0-9a-f]{40})\|(.+)\|(.+)$/;

    for (const line of lines) {
      const trimmedLine = line.trim();

      // Skip empty lines (Git often puts a newline between commits)
      if (!trimmedLine) {
        continue;
      }

      const match = trimmedLine.match(commitHeaderRegex);

      if (match) {
        // If we have a previous commit stored, push it to the array
        if (currentCommit && currentCommit.hash) {
          commits.push(currentCommit as GitCommit);
        }

        // Start a new commit
        currentCommit = {
          hash: match[1],
          timestamp: match[2],
          message: match[3],
          files: []
        };
      } else {
        // If the line is not a header, it's a filename
        // Ensure we are inside a commit block before adding files
        if (currentCommit && currentCommit.files) {
          currentCommit.files.push(trimmedLine);
        }
      }
    }

    // Push the last commit remaining in the buffer
    if (currentCommit && currentCommit.hash) {
      commits.push(currentCommit as GitCommit);
    }

    return commits;
  }
}
