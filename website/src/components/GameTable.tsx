import React, { useMemo } from 'react';
import { Link } from 'react-router-dom';
import { Game } from '../model/Game';
import './GameTable.scss'
import GameRow from './GameRow';

type GameTableProps = {
    games: Game[];
}

const GameTable: React.FC<GameTableProps> = ({ games }: GameTableProps) => {
    return (
        <div id="GameTable">
            <h4 style={{ textAlign: 'left' }}>{games.length === 0 ? 'No Results.' : `${games.length} Results`}</h4>
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
        </div>
    );
}

export default GameTable;