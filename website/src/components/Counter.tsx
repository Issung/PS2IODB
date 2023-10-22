import './Counter.scss';

interface CounterProps {
    /**
     * Value ranging from 0.0 - 1.0.
     */
    value: number;
}

/**
 * To make this component animate a transition properly you need to set it from one value to another.
 * E.g. First set to 0 and then to 0.25, it will animate from 0.00% to 25.00%.
 */
const Counter = (props: CounterProps) => {
    // How to define CSS variables in React style: https://stackoverflow.com/a/54128069/8306962
    const style = { "--percent": props.value } as React.CSSProperties;

    return (
        <strong className="counter" style={style}></strong>
    )
};

export default Counter;