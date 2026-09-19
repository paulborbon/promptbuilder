import {openStore} from './core.js';
const db = openStore(process.env.DB_PATH || './data/referrals.sqlite');
if (process.argv[2] === 'retry' && /^PB-[0-9a-f-]{36}$/i.test(process.argv[3] || '')) {
  const result = db.prepare("UPDATE deliveries SET state='pending',attempts=0,next_at=0,error=NULL WHERE id=? AND state='failed'").run(process.argv[3]);
  console.log('Failed emails returned to queue:',result.changes);
} else {
  console.table(db.prepare('SELECT id,role,state,attempts,error FROM deliveries ORDER BY rowid DESC LIMIT 100').all());
}
db.close();
