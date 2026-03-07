import { NavigateFunction } from 'react-router-dom';
import { ContributedIcons } from '../model/Titles';

export function navigateToRandomIcon(navigate: NavigateFunction): void {
    const randomIcon = ContributedIcons[Math.floor(Math.random() * ContributedIcons.length)];
    navigate(`/icon/${randomIcon.code}`);
}
