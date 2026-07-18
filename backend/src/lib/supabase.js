const { createClient } = require("@supabase/supabase-js");

// A service role key tem permissão total no Storage — nunca exponha ela no front-end.
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY
);

const BUCKET = process.env.SUPABASE_STORAGE_BUCKET || "servitrack-fotos";

// Garante que o bucket de fotos existe (roda uma vez, na subida do servidor)
async function ensureBucket() {
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) throw error;
    const existe = buckets?.some((b) => b.name === BUCKET);
    if (!existe) {
      const { error: erroCriar } = await supabase.storage.createBucket(BUCKET, {
        public: true,
        fileSizeLimit: "8MB",
      });
      if (erroCriar) throw erroCriar;
      console.log(`Bucket "${BUCKET}" criado no Supabase Storage.`);
    }
  } catch (err) {
    console.warn(
      `Aviso: não foi possível confirmar/criar o bucket "${BUCKET}" automaticamente (${err.message}). ` +
        `Se o upload de fotos falhar, crie o bucket manualmente no painel do Supabase (Storage > New bucket, marcado como público).`
    );
  }
}

module.exports = { supabase, BUCKET, ensureBucket };
