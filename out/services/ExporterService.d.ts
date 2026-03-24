export declare class ExporterService {
    /**
     * Formats markdown for Microsoft Teams (removes emojis, ensures bold compatibility).
     */
    formatForTeams(markdown: string): string;
    /**
     * Generates a mailto link and opens it.
     */
    exportToEmail(markdown: string): Promise<void>;
    /**
     * Exports content to a Notion page via PATCH blocks children.
     */
    exportToNotion(markdown: string, config: {
        token: string;
        pageId: string;
    }): Promise<string>;
    /**
     * Posts a comment to a Jira issue.
     */
    exportToJira(markdown: string, config: {
        domain: string;
        email: string;
        token: string;
        issueKey: string;
    }): Promise<string>;
}
//# sourceMappingURL=ExporterService.d.ts.map