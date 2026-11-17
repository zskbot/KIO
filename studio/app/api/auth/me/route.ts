import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/session";
export const dynamic="force-dynamic";
export async function GET(){try{return NextResponse.json({user:await getSessionUser()});}catch{return NextResponse.json({user:null});}}
