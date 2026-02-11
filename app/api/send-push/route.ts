import { NextResponse } from 'next/server';
import { sendPushToUser } from '@/lib/push-notifications';

export async function POST(request: Request) {
    try {
        const body = await request.json();
        const { userId, title, body: messageBody, url, data } = body;

        if (!userId || !title || !messageBody) {
            return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
        }

        const result = await sendPushToUser(userId, {
            title,
            body: messageBody,
            url,
            data
        });

        return NextResponse.json({ 
            success: true, 
            sent: result.success, 
            failed: result.failed,
            error: result.error 
        });

    } catch (error: any) {
        console.error('Error in /api/send-push:', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
