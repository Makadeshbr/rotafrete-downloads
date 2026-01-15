
declare module '@aether-baas/functions' {
    export interface AetherContext {
        data: any;
        env: Record<string, string>;
        token?: string;
    }

    export type AetherFunction<T = any> = (context: {
        data: T;
        db: any;
        log: any;
        push: any;
    }) => Promise<any>;

    export function getDb(): any;
    export function getPush(): any;
}
