import prisma from '../db/prisma';
import { RAGService } from '../services/rag/rag.service';

const ragService = new RAGService();

async function main() {
  console.log('🔄 Starting Re-embedding process for all document chunks...');
  
  // 1. Fetch all chunks
  const chunks = await prisma.documentChunk.findMany({
    select: {
      id: true,
      content: true,
    }
  });

  console.log(`📂 Found ${chunks.length} chunks to update.`);

  let successCount = 0;

  // 2. Loop and generate prefix-aware nomic embeddings
  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    try {
      console.log(`⚡ Embedding chunk ${i + 1}/${chunks.length} (ID: ${chunk.id})...`);
      
      // Generating prefix-aware embedding ('search_document: ')
      const embedding = await ragService.getEmbedding(chunk.content, false);
      const vectorStr = `[${embedding.join(',')}]`;

      // Update in database using parameterized query
      await prisma.$executeRaw`
        UPDATE "DocumentChunk"
        SET embedding = ${vectorStr}::vector
        WHERE id = ${chunk.id}
      `;
      
      successCount++;
    } catch (error: any) {
      console.error(`❌ Failed to embed chunk ${chunk.id}:`, error.message);
    }
  }

  console.log(`✅ Finished! Successfully re-embedded ${successCount}/${chunks.length} chunks.`);
  process.exit(0);
}

main().catch(err => {
  console.error('💥 Fatal error running re-embedding script:', err);
  process.exit(1);
});
