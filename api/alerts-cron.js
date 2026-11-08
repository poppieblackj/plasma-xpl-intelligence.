'use strict';
// Vercel Cron invokes GET and signs the request with CRON_SECRET.
// Delegate to the same authenticated POST monitor to keep one checks pipeline.
const monitor=require('./alerts-check');
module.exports=async(req,res)=>{
 if(req.method!=='GET'){res.statusCode=405;res.end('Method Not Allowed');return}
 return monitor({...req,method:'POST',headers:req.headers},res);
};
