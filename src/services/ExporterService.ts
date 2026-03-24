import * as vscode from 'vscode';

/**
 * Helper: Simple Markdown to Plain Text conversion for Email
 */
const stripMarkdown = (markdown: string): string => {
    return markdown
        .replace(/#{1,6}\s/g, '') // Remove headers
        .replace(/\*\*(.*?)\*\*/g, '$1') // Remove bold
        .replace(/\*(.*?)\*/g, '$1') // Remove italic
        .replace(/`{1,3}(.*?)`{1,3}/g, '$1') // Remove inline code
        .replace(/!\[.*?\]\(.*?\)/g, '') // Remove images
        .replace(/\[(.*?)\]\(.*?\)/g, '$1'); // Remove links, keep text
};

/**
 * Helper: Basic Markdown to Notion Blocks conversion
 */
const markdownToNotionBlocks = (markdown: string): any[] => {
    const blocks: any[] = [];
    const lines = markdown.split('\n');

    lines.forEach(line => {
        const trimmed = line.trim();
        if (!trimmed) return;

        // Check for Headers
        if (trimmed.startsWith('###')) {
            blocks.push({
                object: 'block',
                type: 'heading_3',
                heading_3: {
                    rich_text: [{ type: 'text', text: { content: trimmed.replace(/###\s/, '') } }]
                }
            });
        } else if (trimmed.startsWith('##')) {
            blocks.push({
                object: 'block',
                type: 'heading_2',
                heading_2: {
                    rich_text: [{ type: 'text', text: { content: trimmed.replace(/##\s/, '') } }]
                }
            });
        } 
        // Check for Bullet Points
        else if (trimmed.startsWith('-') || trimmed.startsWith('*')) {
            blocks.push({
                object: 'block',
                type: 'bulleted_list_item',
                bulleted_list_item: {
                    rich_text: [{ type: 'text', text: { content: trimmed.replace(/^[-*]\s/, '') } }]
                }
            });
        } 
        // Default to Paragraph
        else {
            blocks.push({
                object: 'block',
                type: 'paragraph',
                paragraph: {
                    rich_text: [{ type: 'text', text: { content: trimmed } }]
                }
            });
        }
    });

    return blocks;
};

export class ExporterService {
    /**
     * Formats markdown for Microsoft Teams (removes emojis, ensures bold compatibility).
     */
    public formatForTeams(markdown: string): string {
        // Regex to match broad range of emojis
        const emojiRegex = /[\p{Extended_Pictographic}\u{1F300}-\u{1F5FF}\u{1F900}-\u{1F9FF}\u{1F600}-\u{1F64F}\u{1F680}-\u{1F6FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;

        // Remove emojis first
        let cleanText = markdown.replace(emojiRegex, '');

        // Convert HTML to markdown, trimming content inside tags
        cleanText = cleanText.replace(/<(b|strong)>(.*?)<\/(b|strong)>/g, (match, tag, content) => {
            const trimmedContent = content.trim();
            return `**${trimmedContent}**`;
        });

        // Clean up extra whitespace
        cleanText = cleanText.replace(/\s+/g, ' ').trim();

        return cleanText;
    }

    /**
     * Generates a mailto link and opens it.
     */
    public async exportToEmail(markdown: string) {
        const dateStr = new Date().toLocaleDateString();
        const subject = encodeURIComponent(`Daily Standup – ${dateStr}`);
        const body = encodeURIComponent(stripMarkdown(markdown));
        const mailtoLink = `mailto:?subject=${subject}&body=${body}`;
        
        await vscode.env.openExternal(vscode.Uri.parse(mailtoLink));
    }

    /**
     * Exports content to a Notion page via PATCH blocks children.
     */
    public async exportToNotion(markdown: string, config: { token: string; pageId: string }) {
        if (!config.token || !config.pageId) {
            throw new Error('Notion Token or Page ID is missing.');
        }

        const blocks = markdownToNotionBlocks(markdown);
        const url = `https://api.notion.com/v1/blocks/${config.pageId}/children`;

        const response = await fetch(url, {
            method: 'PATCH',
            headers: {
                'Authorization': `Bearer ${config.token}`,
                'Content-Type': 'application/json',
                'Notion-Version': '2022-06-28'
            },
            body: JSON.stringify({ children: blocks })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Notion API Error: ${response.status} - ${errorText}`);
        }

        return 'Successfully exported to Notion.';
    }

    /**
     * Posts a comment to a Jira issue.
     */
    public async exportToJira(markdown: string, config: { domain: string; email: string; token: string; issueKey: string }) {
        const { domain, email, token, issueKey } = config;
        
        if (!domain || !email || !token || !issueKey) {
            throw new Error('Jira credentials or Issue Key are missing.');
        }

        const auth = Buffer.from(`${email}:${token}`).toString('base64');
        const url = `https://${domain}.atlassian.net/rest/api/2/issue/${issueKey}/comment`;

        const response = await fetch(url, {
            method: 'POST',
            headers: {
                'Authorization': `Basic ${auth}`,
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ body: markdown })
        });

        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Jira API Error: ${response.status} - ${errorText}`);
        }

        return `Successfully commented on Jira issue ${issueKey}.`;
    }
}
