import { NextResponse } from "next/server";
export const dynamic="force-dynamic";
export async function GET(){return NextResponse.json({service:"kio-studio",status:"ok",version:"0.1.0",aiProviderConfigured:Boolean(process.env.KIO_LLM_API_KEY),databaseConfigured:Boolean(process.env.DATABASE_URL)});}
