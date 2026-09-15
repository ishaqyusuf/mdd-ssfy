import { closeSharedRedisClient } from '@gnd/cache/shared-redis';
import { hasUpstashRestConfig } from '@gnd/cache/upstash-rest';
import { getAssistantCaptureHealth, recordAssistantCaptureHealth } from '../src/assistant/capture-health';
import { sendAssistantRedisCommand } from '../src/assistant/redis-command';
import { captureAssistantDiagnostic } from '../src/assistant/diagnostics';
const target = new URL(process.env.DATABASE_URL ?? '');
if (!['localhost','127.0.0.1'].includes(target.hostname) || target.port !== '3307') throw new Error('Local QA profile required');
const redisTarget = new URL(process.argv[2] ?? '');
if (redisTarget.hostname !== '127.0.0.1' || redisTarget.protocol !== 'redis:') throw new Error('Loopback Redis test URL required');
process.env.REDIS_URL = redisTarget.toString();
if (hasUpstashRestConfig()) throw new Error('Hosted Redis configuration is not allowed in this isolated check');
const scratch = `gnd:assistant:capture-health:qa:${crypto.randomUUID()}`;
const command = async (args: (string | number)[]) => {
 const copy = [...args]; copy[args[0] === 'EVAL' ? 3 : 1] = scratch;
 return sendAssistantRedisCommand(copy);
};
try {
 await sendAssistantRedisCommand(['PING']);
 await recordAssistantCaptureHealth({stored:true,monitoring:'submitted'}, command);
 await captureAssistantDiagnostic(new Error('Synthetic storage outage'), {stage:'database',operation:'qa.synthetic.health'}, {
  store: async () => { throw new Error('Injected database failure'); }, monitor: () => undefined, fallback: () => {},
  health: event => recordAssistantCaptureHealth(event,command),
 });
 const health = await getAssistantCaptureHealth(command);
 const ttl = Number(await sendAssistantRedisCommand(['TTL',scratch]));
 if (!health.available || health.counts.attempts !== 2 || health.counts.storageConfirmed !== 1 || health.counts.storageUnconfirmed !== 1 || health.counts.monitorSubmitted !== 1 || health.counts.monitorUnavailable !== 1 || ttl <= 0 || ttl > 2678400) throw new Error('Health integration assertion failed');
 console.log(JSON.stringify({synthetic:true,isolatedKey:true,counts:health.counts,expiryVerified:true}));
} finally {
 try { await sendAssistantRedisCommand(['DEL',scratch]); }
 finally { closeSharedRedisClient(); }
}
