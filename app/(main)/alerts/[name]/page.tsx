'use client'

import { useParams } from 'next/navigation'
import { EmailAlerts } from '../../_components/EmailAlerts'
import { PostSuccessAlerts } from '../../_components/PostSuccessAlert'
import { PostFailureAlerts } from '../../_components/PostFailure'
import { NewReleasesAlerts } from '../../_components/NewReleases'

export default function AlertsPage() {
    const { name } = useParams<{ name: string }>()
    switch(name){
        case 'email':
            return <EmailAlerts />
        case 'postSuccess':
            return <PostSuccessAlerts />
        case 'postFailure':
            return <PostFailureAlerts />
        case 'newReleases':
            return <NewReleasesAlerts />
        default:
            return <div>Invalid Alert</div>
    }
    return null;
}
