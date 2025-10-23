import { AtUri } from "@atp/syntax";
import { IdResolver } from "@atp/identity";
import { XrpcClient } from "@atp/xrpc";
import { Select, prompt } from "@cliffy/prompt";
import { lexicons } from "@atproto/api";
import process from "node:process";

const isDeno = typeof Deno !== "undefined";

interface RecordInfo {
  uri: string;
  value?: Record<string, unknown>;
}

interface PromptState {
  collection?: string;
  rkey?: string;
  collections?: string[];
  records?: RecordInfo[];
  recordAlreadyShown: boolean;
}

async function resolveDid(input: string): Promise<string> {
  const idResolver = new IdResolver({});
  
  if (!input.startsWith("did:")) {
    const handleResolution = await idResolver.handle.resolve(input);
    if (!handleResolution) {
      throw new Error(`Could not resolve handle: ${input}`);
    }
    return handleResolution;
  }
  
  return input;
}

async function getPdsUrl(did: string): Promise<string> {
  const idResolver = new IdResolver({});
  const didDoc = await idResolver.did.resolve(did);
  
  if (!didDoc?.service) {
    throw new Error(`Could not resolve DID document for ${did}`);
  }
  
  const pdsService = didDoc.service.find(
    (s) => s.id === "#atproto_pds" || s.type === "AtprotoPersonalDataServer"
  );
  
  if (!pdsService?.serviceEndpoint) {
    throw new Error(`Could not find PDS endpoint for ${did}`);
  }
  
  return typeof pdsService.serviceEndpoint === "string"
    ? pdsService.serviceEndpoint
    : String(pdsService.serviceEndpoint);
}

function createXrpcClient(pdsUrl: string): XrpcClient {
  return new XrpcClient({ service: pdsUrl }, lexicons);
}

async function loadCollections(
  xrpcClient: XrpcClient,
  did: string,
): Promise<string[]> {
  const response = await xrpcClient.call("com.atproto.repo.describeRepo", {
    repo: did,
  });
  
  const collections = response.data.collections || [];
  
  if (collections.length === 0) {
    throw new Error(`No collections found for ${did}`);
  }
  
  return collections;
}

async function listRecords(
  xrpcClient: XrpcClient,
  did: string,
  collection: string,
): Promise<RecordInfo[]> {
  const response = await xrpcClient.call("com.atproto.repo.listRecords", {
    repo: did,
    collection,
    limit: 100,
  });
  
  return response.data.records || [];
}

async function loadRecords(
  xrpcClient: XrpcClient,
  did: string,
  collection: string,
): Promise<RecordInfo[]> {
  const records = await listRecords(xrpcClient, did, collection);
  
  if (records.length === 0) {
    throw new Error(`No records found in collection ${collection}`);
  }
  
  return records;
}

async function fetchRecord(
  xrpcClient: XrpcClient,
  did: string,
  collection: string,
  rkey: string,
): Promise<unknown> {
  const response = await xrpcClient.call("com.atproto.repo.getRecord", {
    repo: did,
    collection,
    rkey,
  });
  
  return response.data;
}

function formatRecordOption(record: RecordInfo): { name: string; value: RecordInfo } {
  const rkey = record.uri.split('/').pop() || "";
  const value = record.value || {};
  const displayName = (value.displayName || value.name || value.title || "") as string;
  
  const name = `${rkey}${displayName ? ` - ${displayName}` : ""}`;
  
  return { name, value: record };
}

function createCollectionPrompt(
  did: string,
  xrpcClient: XrpcClient,
  state: PromptState,
) {
  const collectionPrompt = {
    name: "collection",
    message: `Select a collection from ${did}:`,
    type: Select,
    before: async (_answers: unknown, next: (skip?: number | boolean) => Promise<void>) => {
      state.collections = await loadCollections(xrpcClient, did);
      collectionPrompt.options = state.collections.map((col: string) => ({
        name: col,
        value: col,
      }));
      collectionPrompt.search = state.collections.length > 5;
      await next();
    },
    options: [] as Array<{ name: string; value: unknown }>,
    search: false,
    maxRows: 10,
    after: async (answers: Record<string, unknown>, next: () => Promise<void>) => {
      state.collection = answers.collection as string;
      await next();
    },
  };
  
  return collectionPrompt;
}

function createRecordPrompt(
  did: string,
  xrpcClient: XrpcClient,
  state: PromptState,
) {
  const recordPrompt = {
    name: "record",
    message: `Select a record from ${state.collection || "collection"}:`,
    type: Select,
    before: async (_answers: unknown, next: (skip?: number | boolean) => Promise<void>) => {
      if (state.rkey) {
        await next(1);
        return;
      }
      
      if (!state.collection) {
        throw new Error("Collection is required");
      }
      
      state.records = await loadRecords(xrpcClient, did, state.collection);
      
      if (state.records.length === 1) {
        const singleRecord = state.records[0].value || state.records[0];
        state.rkey = state.records[0].uri.split('/').pop() || "";
        console.log(JSON.stringify(singleRecord, null, 2));
        state.recordAlreadyShown = true;
        await next(true);
        return;
      }
      
      recordPrompt.options = state.records.map(formatRecordOption);
      recordPrompt.search = state.records.length > 5;
      await next();
    },
    options: [] as Array<{ name: string; value: unknown }>,
    search: false,
    maxRows: 10,
    after: async (answers: Record<string, unknown>, next: () => Promise<void>) => {
      const selected = answers.record as RecordInfo | string | undefined;
      if (selected) {
        if (typeof selected === "object" && "uri" in selected) {
          state.rkey = selected.uri.split('/').pop() || "";
        } else if (typeof selected === "string") {
          state.rkey = selected;
        }
      }
      await next();
    },
  };
  
  return recordPrompt;
}

function createFetchPrompt(
  did: string,
  xrpcClient: XrpcClient,
  state: PromptState,
) {
  return {
    name: "fetch",
    message: "",
    type: Select,
    before: async (_answers: unknown, next: (skip?: number | boolean) => Promise<void>) => {
      if (state.recordAlreadyShown) {
        await next(true);
        return;
      }
      
      if (!state.collection || !state.rkey) {
        throw new Error("Collection and rkey are required");
      }
      
      const record = await fetchRecord(xrpcClient, did, state.collection, state.rkey);
      console.log(JSON.stringify(record, null, 2));
      await next(true);
    },
    options: [],
  };
}

export async function handleGetCommand(input: string) {
  try {
    const isFullUri = input.includes('/');
    let atUri: AtUri | null = null;
    let did: string;
    
    if (isFullUri) {
      atUri = new AtUri(input);
      did = await resolveDid(atUri.hostname);
    } else {
      did = await resolveDid(input);
    }
    
    const pdsUrl = await getPdsUrl(did);
    const xrpcClient = createXrpcClient(pdsUrl);
    
    const state: PromptState = {
      collection: atUri?.collection,
      rkey: atUri?.rkey,
      recordAlreadyShown: false,
    };
    
    const prompts: Array<{
      name: string;
      message: string;
      type: typeof Select;
      before?: (answers: unknown, next: (skip?: number | boolean) => Promise<void>) => Promise<void>;
      after?: (answers: Record<string, unknown>, next: () => Promise<void>) => Promise<void>;
      options: Array<{ name: string; value: unknown }>;
      search?: boolean;
      maxRows?: number;
    }> = [];
    
    if (!state.collection) {
      prompts.push(createCollectionPrompt(did, xrpcClient, state));
    }
    
    prompts.push(createRecordPrompt(did, xrpcClient, state));
    prompts.push(createFetchPrompt(did, xrpcClient, state));
    
    await prompt(prompts as unknown as Parameters<typeof prompt>[0]);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    console.error(`Error fetching record: ${errorMessage}`);
    if (isDeno) Deno.exit(1);
    else process.exit(1);
  }
}