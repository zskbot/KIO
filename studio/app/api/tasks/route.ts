import { NextRequest,NextResponse } from "next/server";
import { z } from "zod";
import { prisma } from "@/lib/prisma";
import { getSessionUser } from "@/lib/session";
export const dynamic="force-dynamic";
export async function GET(){const user=await getSessionUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});const tasks=await prisma.task.findMany({where:{userId:user.id},orderBy:{updatedAt:"desc"},take:50});return NextResponse.json({tasks});}
export async function POST(request:NextRequest){const user=await getSessionUser();if(!user)return NextResponse.json({error:"Unauthorized"},{status:401});const parsed=z.object({title:z.string().trim().min(1).max(120),description:z.string().max(4000).default("")}).safeParse(await request.json().catch(()=>null));if(!parsed.success)return NextResponse.json({error:"Invalid task."},{status:400});const task=await prisma.task.create({data:{...parsed.data,userId:user.id}});return NextResponse.json({task},{status:201});}
