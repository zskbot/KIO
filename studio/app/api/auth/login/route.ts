import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/prisma";
import { createSession } from "@/lib/session";
const schema=z.object({email:z.string().email().max(254).transform(v=>v.toLowerCase()),password:z.string().min(1).max(128)});
export async function POST(request:NextRequest){try{const parsed=schema.safeParse(await request.json());if(!parsed.success)return NextResponse.json({error:"Invalid email or password."},{status:400});const user=await prisma.user.findUnique({where:{email:parsed.data.email}});if(!user||!(await bcrypt.compare(parsed.data.password,user.passwordHash)))return NextResponse.json({error:"Email or password is incorrect."},{status:401});await createSession(user.id);return NextResponse.json({user:{id:user.id,name:user.name,email:user.email}});}catch{return NextResponse.json({error:"Sign in unavailable. Check database and auth configuration."},{status:503});}}
