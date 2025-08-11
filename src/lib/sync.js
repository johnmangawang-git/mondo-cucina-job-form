// src/lib/sync.js
import { supabase } from '../api/supabase';
import { getPendingJobOrders } from './idb';

export const syncPendingJobOrders = async () => {
  const pendingJobs = await getPendingJobOrders();
  
  for (const job of pendingJobs) {
    try {
      // Upload media files to Supabase Storage
      const mediaUrls = await Promise.all(
        job.mediaFiles.map(async (file) => {
          const filePath = `media/${job.id}/${file.name}`;
          const { error } = await supabase.storage
            .from('job-media')
            .upload(filePath, file);
          
          if (error) throw error;
          
          return supabase.storage
            .from('job-media')
            .getPublicUrl(filePath).data.publicUrl;
        })
      );
      
      // Upload signature
      const signaturePath = `signatures/${job.id}.png`;
      const signatureBlob = await fetch(job.signature).then(r => r.blob());
      await supabase.storage
        .from('signatures')
        .upload(signaturePath, signatureBlob);
      
      const signatureUrl = supabase.storage
        .from('signatures')
        .getPublicUrl(signaturePath).data.publicUrl;
      
      // Save to database
      const { data, error } = await supabase
        .from('job_orders')
        .insert({
          ...job,
          media_urls: mediaUrls,
          signature_url: signatureUrl,
          status: 'synced'
        });
      
      if (error) throw error;
      
      // Remove from local DB
      await removeFromLocalDB(job.id);
      
    } catch (error) {
      console.error('Sync failed:', error);
    }
  }
};

// Periodically attempt sync
setInterval(() => {
  if (navigator.onLine) syncPendingJobOrders();
}, 5 * 60 * 1000); // Every 5 minutes