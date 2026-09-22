import test from 'node:test';
import assert from 'node:assert/strict';
import {canMutate, sameContext, visibleFeed} from '../app/view-state.ts';

const feedA = {job: {id:'agent'}, undo_event_id:42, items:[{id:'a01',state:'shortlisted'}]};
const feedB = {job: {id:'infra'}, undo_event_id:73, items:[{id:'a01',state:'active'}]};

test('slow role fetch hides old cards and old undo before the new response arrives', async()=>{
  const selected='infra';
  let stored=feedA;
  let loading=true;
  let finish;
  const pending=new Promise(resolve=>{finish=resolve;});
  assert.equal(visibleFeed(stored,selected),null);
  assert.equal(canMutate(stored,selected,loading,false,''),false);
  assert.equal(visibleFeed(stored,selected)?.undo_event_id,undefined);
  finish(feedB);
  stored=await pending;
  loading=false;
  assert.equal(visibleFeed(stored,selected).undo_event_id,73);
  assert.equal(canMutate(stored,selected,loading,false,''),true);
});

test('failed role fetch never exposes or mutates the previous role',async()=>{
  const selected='infra';
  let error='';
  try{await Promise.reject(new Error('503 simulated backend unavailable'));}catch(e){error=e.message;}
  assert.equal(visibleFeed(feedA,selected),null);
  assert.equal(canMutate(feedA,selected,false,false,error),false);
  assert.equal(canMutate(feedA,selected,false,false,''),false);
});

test('delayed action completion cannot update another role modal with the same candidate ID',async()=>{
  const requestJob='agent';
  let selected='agent';
  let modal={jobId:'agent',candidateId:'a01',state:'active'};
  let finish;
  const pending=new Promise(resolve=>{finish=resolve;});
  const apply=pending.then(()=>{if(sameContext(requestJob,selected,modal.jobId))modal.state='shortlisted';});
  selected='infra';
  modal={jobId:'infra',candidateId:'a01',state:'active'};
  finish();
  await apply;
  assert.equal(modal.state,'active');
  assert.equal(sameContext(requestJob,selected),false);
});

test('loading, errors and in-flight actions disable every mutation even within one role',()=>{
  assert.equal(canMutate(feedA,'agent',false,false,''),true);
  assert.equal(canMutate(feedA,'agent',true,false,''),false);
  assert.equal(canMutate(feedA,'agent',false,true,''),false);
  assert.equal(canMutate(feedA,'agent',false,false,'network error'),false);
  assert.equal(sameContext('agent','agent','infra'),false);
  assert.equal(sameContext('agent','agent','agent'),true);
});
