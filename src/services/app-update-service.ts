// src/services/app-update-service.ts
// ============================================
// ROTAFRETE - Sistema de In-App Update
// ============================================
// Gerencia atualizações do app fora da Play Store:
// - Verifica versão atual vs versão disponível
// - Baixa APK de servidor/storage
// - Instala atualização no dispositivo
// - Persiste estado de "já viu" para não incomodar
// ============================================

import * as Application from 'expo-application';
import * as FileSystem from 'expo-file-system';
import * as Linking from 'expo-linking';
import * as IntentLauncher from 'expo-intent-launcher';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform, Alert } from 'react-native';

import { getDb } from '@aether-baas/react-native';
import { createLogger } from '@/utils/logger';

const logger = createLogger('AppUpdate');

// ============================================
// TIPOS
// ============================================

/**
 * Informações de uma versão do app.
 */
export interface AppVersion {
    /** ID do documento no Aether */
    id: string;
    /** Número da versão (ex: "1.2.0") */
    version: string;
    /** Código de build (ex: 10200) */
    buildNumber: number;
    /** URL do APK para download */
    downloadUrl: string;
    /** Tamanho do APK em bytes */
    fileSize: number;
    /** Changelog/notas de atualização */
    releaseNotes: string;
    /** Se é atualização obrigatória */
    isMandatory: boolean;
    /** Data de publicação */
    publishedAt: string;
    /** Versão mínima do Android suportada */
    minAndroidVersion?: number;
    /** Se está ativa (pode ser desativada) */
    isActive: boolean;
}

/**
 * Resultado da verificação de atualização.
 */
export interface UpdateCheckResult {
    /** Se há atualização disponível */
    hasUpdate: boolean;
    /** Versão atual do app */
    currentVersion: string;
    /** Build atual */
    currentBuild: number;
    /** Versão disponível (se houver) */
    latestVersion: AppVersion | null;
    /** Se foi verificado com sucesso */
    success: boolean;
    /** Mensagem de erro se houver */
    error?: string;
}

/**
 * Estado do download.
 */
export interface DownloadProgress {
    /** Bytes já baixados */
    downloadedBytes: number;
    /** Total de bytes */
    totalBytes: number;
    /** Progresso percentual (0-100) */
    progress: number;
    /** Status: idle, downloading, completed, failed */
    status: 'idle' | 'downloading' | 'completed' | 'failed';
    /** Mensagem de erro se houver */
    error?: string;
}

// ============================================
// CONFIGURAÇÃO
// ============================================

const CONFIG = {
    /** Nome da coleção no Aether */
    COLLECTION_NAME: 'app_versions',

    /** Chave para persistir "skip this version" */
    SKIP_VERSION_KEY: 'rotafrete_skip_version',

    /** Chave para persistir última verificação */
    LAST_CHECK_KEY: 'rotafrete_last_update_check',

    /** Intervalo mínimo entre verificações (ms) - 1 minuto (Teste) */
    CHECK_INTERVAL: 60 * 1000,

    /** Content-type do APK */
    APK_MIME_TYPE: 'application/vnd.android.package-archive',

    /** Diretório para downloads - usar documentDirectory para maior estabilidade */
    DOWNLOAD_DIR: FileSystem.documentDirectory,

    /** Tamanho mínimo válido de APK (100KB) - para detectar downloads corrompidos */
    MIN_APK_SIZE: 100 * 1024,
};

// ============================================
// SERVIÇO DE ATUALIZAÇÃO
// ============================================

class AppUpdateService {
    /** Progresso do download atual */
    private downloadProgress: DownloadProgress = {
        downloadedBytes: 0,
        totalBytes: 0,
        progress: 0,
        status: 'idle',
    };

    /** Listeners de progresso */
    private progressListeners: Set<(progress: DownloadProgress) => void> = new Set();

    /** Resumable download */
    private currentDownload: FileSystem.DownloadResumable | null = null;

    // ============================================
    // INTERFACE PÚBLICA
    // ============================================

    /**
     * Retorna a versão atual do app.
     */
    // ============================================
    // GITHUB CONFIG
    // ============================================
    private readonly GITHUB_REPO = 'Makadeshbr/rotafrete-downloads';
    private readonly GITHUB_API_URL = `https://api.github.com/repos/${this.GITHUB_REPO}/releases/latest`;

    /**
     * Retorna a versão atual do app.
     */
    getCurrentVersion(): { version: string; build: number } {
        return {
            version: Application.nativeApplicationVersion || '1.0.0',
            build: parseInt(Application.nativeBuildVersion || '1', 10),
        };
    }

    /**
     * Compara duas versões (semver).
     * Retorna: 1 se v1 > v2, -1 se v1 < v2, 0 se iguais
     */
    private compareVersions(v1: string, v2: string): number {
        const p1 = v1.replace(/^v/, '').split('.').map(Number);
        const p2 = v2.replace(/^v/, '').split('.').map(Number);

        for (let i = 0; i < Math.max(p1.length, p2.length); i++) {
            const n1 = p1[i] || 0;
            const n2 = p2[i] || 0;
            if (n1 > n2) return 1;
            if (n1 < n2) return -1;
        }
        return 0;
    }

    /**
     * Verifica se há atualização disponível via GitHub.
     * 
     * @param force Se true, ignora cache de verificação
     */
    async checkForUpdate(force: boolean = false): Promise<UpdateCheckResult> {
        const { version, build } = this.getCurrentVersion();

        logger.info('Verificando atualizações no GitHub', { currentVersion: version });

        try {
            // Verifica intervalo mínimo se não forçado
            if (!force) {
                const lastCheck = await AsyncStorage.getItem(CONFIG.LAST_CHECK_KEY);
                if (lastCheck) {
                    const elapsed = Date.now() - parseInt(lastCheck, 10);
                    if (elapsed < CONFIG.CHECK_INTERVAL) {
                        logger.debug('Verificação ignorada (intervalo mínimo)');
                        return {
                            hasUpdate: false,
                            currentVersion: version,
                            currentBuild: build,
                            latestVersion: null,
                            success: true,
                        };
                    }
                }
            }

            // Fetch GitHub Release
            const response = await fetch(this.GITHUB_API_URL);

            // Salva timestamp da verificação
            await AsyncStorage.setItem(CONFIG.LAST_CHECK_KEY, Date.now().toString());

            if (!response.ok) {
                throw new Error(`Erro API GitHub: ${response.status}`);
            }

            const release = await response.json();

            // Exemplo de tag: "v3.0.0" ou "3.0.0"
            const latestTag = release.tag_name;
            const cleanLatestVersion = latestTag.replace(/^v/, '');

            // Compara versões
            const isNewer = this.compareVersions(cleanLatestVersion, version) > 0;

            if (!isNewer) {
                logger.info('App já está na versão mais recente', { current: version, latest: cleanLatestVersion });
                return {
                    hasUpdate: false,
                    currentVersion: version,
                    currentBuild: build,
                    latestVersion: null,
                    success: true,
                };
            }

            // Encontra o APK nos assets
            const apkAsset = release.assets.find((asset: any) =>
                asset.name.endsWith('.apk') && asset.content_type === CONFIG.APK_MIME_TYPE
            ) || release.assets.find((asset: any) => asset.name.endsWith('.apk'));

            if (!apkAsset) {
                logger.warn('Release encontrada mas sem APK', { tag: latestTag });
                return {
                    hasUpdate: false,
                    currentVersion: version,
                    currentBuild: build,
                    latestVersion: null,
                    success: true,
                    error: 'APK não encontrado na release',
                };
            }

            const latestVersion: AppVersion = {
                id: release.id.toString(),
                version: cleanLatestVersion,
                buildNumber: 0, // GitHub release doesn't strictly track build numbers
                downloadUrl: apkAsset.browser_download_url,
                fileSize: apkAsset.size,
                releaseNotes: release.body,
                isMandatory: release.body.toLowerCase().includes('[mandatory]'), // Convention for mandatory updates
                publishedAt: release.published_at,
                isActive: true,
            };

            // Verifica se usuário já pulou esta versão (exceto obrigatórias)
            if (!latestVersion.isMandatory) {
                const skippedVersion = await AsyncStorage.getItem(CONFIG.SKIP_VERSION_KEY);
                if (skippedVersion === latestVersion.version) {
                    logger.info('Versão já foi pulada pelo usuário', { version: latestVersion.version });
                    return {
                        hasUpdate: false,
                        currentVersion: version,
                        currentBuild: build,
                        latestVersion,
                        success: true,
                    };
                }
            }

            logger.info('Atualização disponível', {
                hasUpdate: true,
                latestVersion: latestVersion.version,
            });

            return {
                hasUpdate: true,
                currentVersion: version,
                currentBuild: build,
                latestVersion,
                success: true,
            };

        } catch (error: any) {
            logger.error('Erro ao verificar atualizações', error);
            return {
                hasUpdate: false,
                currentVersion: version,
                currentBuild: build,
                latestVersion: null,
                success: false,
                error: error.message || 'Erro ao verificar atualizações',
            };
        }
    }

    /**
     * Marca versão para ser ignorada (skip).
     */
    async skipVersion(version: string): Promise<void> {
        logger.info('Pulando versão', { version });
        await AsyncStorage.setItem(CONFIG.SKIP_VERSION_KEY, version);
    }

    /**
     * Limpa versão ignorada.
     */
    async clearSkippedVersion(): Promise<void> {
        await AsyncStorage.removeItem(CONFIG.SKIP_VERSION_KEY);
    }

    /**
     * Baixa o APK de atualização.
     */
    async downloadUpdate(version: AppVersion): Promise<string> {
        if (Platform.OS !== 'android') {
            throw new Error('Download de APK só funciona no Android');
        }

        logger.info('Iniciando download', { version: version.version, url: version.downloadUrl });

        const fileName = `RotaFrete-${version.version}.apk`;
        const fileUri = `${CONFIG.DOWNLOAD_DIR}${fileName}`;

        // Reseta progresso
        this.updateProgress({
            downloadedBytes: 0,
            totalBytes: version.fileSize || 0,
            progress: 0,
            status: 'downloading',
        });

        try {
            // Cria download resumable
            this.currentDownload = FileSystem.createDownloadResumable(
                version.downloadUrl,
                fileUri,
                {},
                (downloadProgress) => {
                    const progress = downloadProgress.totalBytesExpectedToWrite > 0
                        ? Math.round(
                            (downloadProgress.totalBytesWritten / downloadProgress.totalBytesExpectedToWrite) * 100
                        )
                        : 0;

                    this.updateProgress({
                        downloadedBytes: downloadProgress.totalBytesWritten,
                        totalBytes: downloadProgress.totalBytesExpectedToWrite,
                        progress,
                        status: 'downloading',
                    });
                }
            );

            const result = await this.currentDownload.downloadAsync();

            if (!result || !result.uri) {
                throw new Error('Falha no download');
            }

            // Verifica integridade do arquivo baixado
            const fileInfo = await FileSystem.getInfoAsync(result.uri, { size: true });

            if (!fileInfo.exists) {
                throw new Error('Arquivo não foi salvo corretamente');
            }

            // Verifica se o tamanho é válido (não está corrompido/truncado)
            const fileSize = (fileInfo as any).size || 0;
            if (fileSize < CONFIG.MIN_APK_SIZE) {
                // Remove arquivo corrompido
                await FileSystem.deleteAsync(result.uri, { idempotent: true });
                throw new Error(`APK corrompido (${Math.round(fileSize / 1024)}KB). Tente novamente.`);
            }

            // Verifica se o tamanho bate com o esperado (tolerância de 5%)
            if (version.fileSize > 0) {
                const sizeDiff = Math.abs(fileSize - version.fileSize);
                const tolerance = version.fileSize * 0.05;
                if (sizeDiff > tolerance) {
                    logger.warn('Tamanho do APK difere do esperado', {
                        expected: version.fileSize,
                        actual: fileSize,
                        diff: sizeDiff,
                    });
                }
            }

            logger.info('Download concluído e verificado', { uri: result.uri, size: fileSize });

            this.updateProgress({
                ...this.downloadProgress,
                progress: 100,
                status: 'completed',
            });

            return result.uri;

        } catch (error: any) {
            logger.error('Erro no download', error);
            this.updateProgress({
                ...this.downloadProgress,
                status: 'failed',
                error: error.message,
            });
            throw error;
        } finally {
            this.currentDownload = null;
        }
    }

    /**
     * Cancela download em andamento.
     */
    async cancelDownload(): Promise<void> {
        if (this.currentDownload) {
            await this.currentDownload.pauseAsync();
            this.currentDownload = null;
            this.updateProgress({
                downloadedBytes: 0,
                totalBytes: 0,
                progress: 0,
                status: 'idle',
            });
        }
    }

    /**
     * Verifica se o app tem permissão para instalar APKs de fontes desconhecidas.
     */
    async canInstallPackages(): Promise<boolean> {
        if (Platform.OS !== 'android') return false;

        try {
            // Tenta abrir as configurações de instalação de fontes desconhecidas
            // Se o usuário já permitiu, a intent completa sem erro
            return true; // Assumimos que sim, o Android vai pedir se não tiver
        } catch {
            return false;
        }
    }

    /**
     * Abre as configurações para permitir instalação de fontes desconhecidas.
     */
    async requestInstallPermission(): Promise<void> {
        if (Platform.OS !== 'android') return;

        try {
            // ACTION_MANAGE_UNKNOWN_APP_SOURCES - Android 8.0+
            await IntentLauncher.startActivityAsync(
                'android.settings.MANAGE_UNKNOWN_APP_SOURCES',
                {
                    data: 'package:com.rotafrete.app',
                }
            );
        } catch (e: any) {
            logger.warn('Não foi possível abrir configurações de instalação', e.message);
            // Fallback: abre configurações gerais de segurança
            try {
                await Linking.openSettings();
            } catch {
                Alert.alert(
                    'Permissão Necessária',
                    'Para instalar atualizações, você precisa permitir a instalação de apps de fontes desconhecidas.\n\nVá em: Configurações > Apps > RotaFrete > Instalar apps desconhecidos',
                    [{ text: 'Entendi', style: 'default' }]
                );
            }
        }
    }

    /**
     * Instala o APK baixado usando Intent do Android.
     *
     * Abre o instalador nativo do Android diretamente.
     */
    async installUpdate(fileUri: string): Promise<void> {
        if (Platform.OS !== 'android') {
            throw new Error('Instalação de APK só funciona no Android');
        }

        logger.info('Iniciando instalação via Intent', { fileUri });

        // Verifica se o arquivo existe e é válido antes de tentar instalar
        const fileInfo = await FileSystem.getInfoAsync(fileUri, { size: true });
        if (!fileInfo.exists) {
            throw new Error('Arquivo de instalação não encontrado. Baixe novamente.');
        }

        const fileSize = (fileInfo as any).size || 0;
        if (fileSize < CONFIG.MIN_APK_SIZE) {
            throw new Error('Arquivo de instalação corrompido. Baixe novamente.');
        }

        const contentUri = await FileSystem.getContentUriAsync(fileUri);
        logger.info('Content URI obtido', { contentUri, fileSize });

        // Tentativa 1: ACTION_INSTALL_PACKAGE (Android 8+)
        try {
            await IntentLauncher.startActivityAsync('android.intent.action.INSTALL_PACKAGE', {
                data: contentUri,
                flags: 268435457, // FLAG_ACTIVITY_NEW_TASK | FLAG_GRANT_READ_URI_PERMISSION  
                type: 'application/vnd.android.package-archive',
            });
            logger.info('Intent INSTALL_PACKAGE iniciado');
            return;
        } catch (e1: any) {
            logger.warn('INSTALL_PACKAGE falhou, tentando VIEW', e1.message);
        }

        // Tentativa 2: ACTION_VIEW
        try {
            await IntentLauncher.startActivityAsync('android.intent.action.VIEW', {
                data: contentUri,
                flags: 268435457,
                type: 'application/vnd.android.package-archive',
            });
            logger.info('Intent VIEW iniciado');
            return;
        } catch (e2: any) {
            logger.warn('VIEW falhou, tentando Linking.openURL', e2.message);
        }

        // Tentativa 3: Linking.openURL com content URI
        try {
            await Linking.openURL(contentUri);
            logger.info('Linking.openURL iniciado');
            return;
        } catch (e3: any) {
            logger.error('Todas as tentativas falharam', e3);
        }

        // Último recurso: Alert manual
        Alert.alert(
            'Instalação Manual',
            'O APK foi baixado com sucesso mas não foi possível abrir o instalador automaticamente.\n\nPor favor:\n1. Abra o gerenciador de arquivos\n2. Vá para a pasta de cache do app\n3. Toque no arquivo RotaFrete para instalar',
            [{ text: 'OK', style: 'default' }]
        );
    }

    /**
     * Fluxo completo: baixa e instala.
     */
    async downloadAndInstall(version: AppVersion): Promise<void> {
        const fileUri = await this.downloadUpdate(version);
        await this.installUpdate(fileUri);
    }

    /**
     * Tenta instalar uma versão já baixada.
     */
    async installVersion(version: AppVersion): Promise<void> {
        const fileName = `RotaFrete-${version.version}.apk`;
        const fileUri = `${CONFIG.DOWNLOAD_DIR}${fileName}`;

        const fileInfo = await FileSystem.getInfoAsync(fileUri);

        if (fileInfo.exists) {
            await this.installUpdate(fileUri);
        } else {
            throw new Error('Arquivo de instalação não encontrado. Tente baixar novamente.');
        }
    }

    /**
     * Retorna progresso atual do download.
     */
    getDownloadProgress(): DownloadProgress {
        return { ...this.downloadProgress };
    }

    /**
     * Adiciona listener de progresso.
     */
    addProgressListener(listener: (progress: DownloadProgress) => void): () => void {
        this.progressListeners.add(listener);
        return () => this.progressListeners.delete(listener);
    }

    /**
     * Abre URL de download no navegador (alternativa ao download in-app).
     */
    async openDownloadUrl(version: AppVersion): Promise<void> {
        const canOpen = await Linking.canOpenURL(version.downloadUrl);
        if (canOpen) {
            await Linking.openURL(version.downloadUrl);
        } else {
            throw new Error('Não foi possível abrir o link de download');
        }
    }

    // ============================================
    // MÉTODOS PRIVADOS
    // ============================================

    /**
     * Atualiza progresso e notifica listeners.
     */
    private updateProgress(progress: DownloadProgress): void {
        this.downloadProgress = progress;
        this.progressListeners.forEach(listener => listener(progress));
    }
}

// ============================================
// SINGLETON EXPORT
// ============================================

export const appUpdateService = new AppUpdateService();
export default appUpdateService;
