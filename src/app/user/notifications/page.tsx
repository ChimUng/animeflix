import Navbarcomponent from '@/components/navbar/Navbar'
import { getAuthSession } from '@/app/api/auth/[...nextauth]/route';
import Notifications from '@/components/settingscomponent/Notifications';

async function page() {
    const session = await getAuthSession();
    return (
        <div>
            <Navbarcomponent home={false} />
            <div className='mt-[80px]'>
                <Notifications session={session}/>
            </div>
        </div>
    )
}

export default page
