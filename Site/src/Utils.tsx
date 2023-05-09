export class Utils {
    static debounce<T extends (...args: any[]) => any>(callback: T, delay: number): (...args: Parameters<T>) => void {
        let timerId: number | null;
        return function debounced(...args: Parameters<T>): void {
            clearTimeout(timerId!);
            timerId = window.setTimeout(() => callback(...args), delay);
        };
    }
}