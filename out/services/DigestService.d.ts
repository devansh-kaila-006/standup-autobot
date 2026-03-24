import { StandupEntry } from './HistoryService';
import { StandupGenerator } from './standupGenerator';
export declare class DigestService {
    /**
     * Generates a weekly summary using the Gemini API.
     */
    static generateWeeklyDigest(history: StandupEntry[], generator: StandupGenerator, apiKey: string): Promise<string>;
}
//# sourceMappingURL=DigestService.d.ts.map