import React, { useEffect } from 'react';
import { useState } from 'react';
import { Game, GameList } from './Games';

type GameTableProps = {
    games: Game[];
}

const GameTable: React.FC<GameTableProps> = ({ games }: GameTableProps) => {
    return (
        <table>
            <thead>
                <tr>
                    <th>Game Title</th>
                    {/* <th>Icons</th> */}
                </tr>
            </thead>
            <tbody>
                {games.map(game => (
                    <GameRow key={/*game.code*/0} game={game}/>
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
                <p>{props.game.name}</p>
            </td>
            {/* <td>
                <p>{props.game.icons}</p>
            </td> */}
        </tr>
    )
};

export default GameTable;