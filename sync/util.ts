import {
  isAccount,
  isCommit,
  isIdentity,
  isSync,
  type RepoEvent,
} from "./firehose/lexicons.ts";

export const didAndSeqForEvt = (
  evt: RepoEvent,
): { did: string; seq: number } | undefined => {
  if (isCommit(evt)) return { seq: evt.seq, did: evt.repo };
  else if (isAccount(evt) || isIdentity(evt) || isSync(evt)) {
    return { seq: evt.seq, did: evt.did };
  }
  return undefined;
};
