import React from 'react';
import { Game } from './Games';
import { Link } from 'react-router-dom';

type GameTableProps = {
    games: Game[];
}

const GameTable: React.FC<GameTableProps> = ({ games }: GameTableProps) => {
    return (
        <table>
            <thead>
                <tr>
                    {/* <th>Game Title</th> */}
                    {/* <th>Icons</th> */}
                </tr>
            </thead>
            <tbody>
                {games.map(game => (
                    <GameRow key={/*game.code*/Math.random()} game={game}/>
                ))}
            </tbody>
        </table>
    );
}

interface GameRowProps {
    game: Game;
}

const GameRow = (props: GameRowProps) => {
    return (
        <tr>
            <td>
                {props.game.code ? <Link to={`/icon/${props.game.code}`}>{props.game.name}</Link> : <p>{props.game.name}</p>}
            </td>
        </tr>
    )
};

export default GameTable;