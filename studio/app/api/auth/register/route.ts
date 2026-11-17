import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
const schema=z.object({name:z.string().trim().min(2).max(80),email:z.string().trim().email().max(254).transform(v=>v.toLowerCase()),password:z.string().min(10).max(128)});
export async function POST(request:NextRequest){try{const parsed=schema.safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:"Invalid name, email or password (minimum 10 characters)."}, {status:400});const {name,email,password}=parsed.data;const passwordHash=await bcrypt.hash(password,12);const user=await prisma.user.create({data:{name,email,passwordHash},select:{id:true,name:true,email:true}});await createSession(user.id);return NextResponse.json({user},{status:201});}catch(error){if(typeof error==="object"&&error!==null&&"code" in error&&error.code==="P2002")return NextResponse.json({error:"An account with this email already exists."},{status:409});return NextResponse.json({error:"Registration unavailable. Check database and auth configuration."},{status:503});}}
