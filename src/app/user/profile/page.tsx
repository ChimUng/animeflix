import Navbarcomponent from '@/components/navbar/Navbar'
import { getAuthSession } from '@/app/api/auth/[...nextauth]/route';

async function page() {
    const session = await getAuthSession();
    return (
        <div>
            <Navbarcomponent />
            <div className='mt-[80px]'>
                <div className='text-2xl font-semibold mb-5'>User Profile</div>
                <div className='bg-white p-5 rounded-lg shadow-md'>
                    <p><strong>Name:</strong> {session?.user?.name}</p>
                    <p><strong>Email:</strong> {session?.user?.email}</p>
                    {/* Add more user details as needed */}
                </div>
            </div>
        </div>
    )
}

export default page;