import { NextResponse } from 'next/server';
import {
  normalizeCustomerSession,
  type CustomerRegistrationPayload,
} from '@/lib/customer';
import { adminAuth, adminDb, adminTimestamp } from '@/lib/firebase-admin';

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const uid = searchParams.get('uid');

    if (!uid) {
      return NextResponse.json({ error: 'uid is required' }, { status: 400 });
    }

    const userSnapshot = await adminDb.collection('users').doc(uid).get();
    if (!userSnapshot.exists) {
      return NextResponse.json({ error: 'Customer not found' }, { status: 404 });
    }

    const membershipSnapshot = await adminDb.collection('memberships').doc(uid).get();

    return NextResponse.json(
      normalizeCustomerSession(
        {
          uid,
          ...(userSnapshot.data() as Record<string, unknown>),
        } as any,
        membershipSnapshot.exists ? membershipSnapshot.data() : null
      )
    );
  } catch (error) {
    console.error('Error fetching customer:', error);
    return NextResponse.json({ error: 'Failed to fetch customer' }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const authHeader = request.headers.get('authorization');
    const token = authHeader?.startsWith('Bearer ') ? authHeader.slice(7) : null;

    if (!token) {
      return NextResponse.json({ error: 'Missing bearer token' }, { status: 401 });
    }

    const decodedToken = await adminAuth.verifyIdToken(token);
    const body = (await request.json()) as CustomerRegistrationPayload;
    const { uid, firstName, lastName, email, phone, address, createMembership, membershipTier } = body;

    if (!uid || decodedToken.uid !== uid) {
      return NextResponse.json({ error: 'Token does not match the customer UID' }, { status: 403 });
    }

    if (!firstName?.trim() || !lastName?.trim() || !email?.trim() || !phone?.trim()) {
      return NextResponse.json({ error: 'Missing required customer fields' }, { status: 400 });
    }

    const userRecord = await adminAuth.getUser(uid);
    const userRef = adminDb.collection('users').doc(uid);
    const membershipRef = adminDb.collection('memberships').doc(uid);
    const existingUser = await userRef.get();

    if (existingUser.exists) {
      return NextResponse.json({ error: 'Customer profile already exists' }, { status: 409 });
    }

    const tier = membershipTier === 'Gold' ? 'Gold' : 'Silver';
    const membership = createMembership
      ? {
          type: tier,
          points: tier === 'Gold' ? 250 : 150,
          startDate: adminTimestamp(),
          endDate: null,
        }
      : null;

    const profile = {
      uid,
      role: 'customer',
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      email: userRecord.email ?? email.trim(),
      phoneNo: phone.trim(),
      branchId: null,
      position: null,
      status: 'Active',
      address: address?.trim() || null,
      createdAt: adminTimestamp(),
      updatedAt: adminTimestamp(),
    };

    const batch = adminDb.batch();
    batch.set(userRef, profile);

    if (membership) {
      batch.set(membershipRef, membership);
    }

    await batch.commit();

    return NextResponse.json({
      success: true,
      customer: normalizeCustomerSession(profile, membership),
    });
  } catch (error) {
    console.error('Error creating customer:', error);
    return NextResponse.json({ error: 'Failed to create customer' }, { status: 500 });
  }
}
