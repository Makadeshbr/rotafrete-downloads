
import { getDb } from '@aether-baas/functions';

// Simple default export async function handler
export default async function deleteData(req: any) {
    // 1. Context Extraction (Aether V2/V3 style)
    const context = req.ctx || {};
    const db = context.db || getDb();
    const auth = context.auth;

    // 2. Body Parsing
    // If req is the payload itself (direct call), logic below handles it.
    // If req is express-like, we use req.body.
    const body = req.body || req;
    const { collection, id } = body;

    if (!auth || !auth.uid) {
        throw new Error('Unauthorized: User not logged in.');
    }

    if (!collection || !id) {
        throw new Error('Missing collection or id');
    }

    // LIST OF ALLOWED COLLECTIONS
    const ALLOWED_COLLECTIONS = [
        'rotas',
        'despesas',
        'agendamentos_manutencao', // Fix collection name mismatch
        'agendamentos',
        'abastecimentos',
        'pedagios'
    ];

    if (!ALLOWED_COLLECTIONS.includes(collection)) {
        throw new Error(`Deletion not allowed for collection: ${collection}`);
    }

    try {
        // 3. Verify Ownership
        const docRef = db.collection(collection).document(id);
        const docFn = await docRef.get();
        // Handle array return from SDK list vs get mismatch
        const doc = Array.isArray(docFn) ? docFn[0] : (docFn?.data ? docFn.data : docFn);

        if (!doc) {
            throw new Error('Document not found');
        }

        const isAdmin = auth.role === 'admin';
        // Check various user ID fields
        const isOwner = (doc.userId === auth.uid) || (doc.motoristaId === auth.uid) || (doc.ownerId === auth.uid);

        if (!isAdmin && !isOwner) {
            throw new Error('Permission denied. You do not own this document.');
        }

        // 4. Perform Deletion
        await docRef.delete();

        return { success: true, deletedId: id };

    } catch (error: any) {
        console.error(`[delete-data] Error:`, error);
        // Throwing error allows Aether runtime to wrap it in 500
        throw new Error(error.message || 'Internal Server Error');
    }
}

