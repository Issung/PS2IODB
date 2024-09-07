import React from 'react';
import { Game } from '../model/Game';
import './GameTable.scss'
import GameRow from './GameRow';
import IconRow from './IconRow';

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
                    {/* TODO: Multiple icon variants are indented below the  */}
                    {games.map(game => {
                        if (game.icons.length > 1)
                        {
                            return game.icons.map(icon => <IconRow icon={icon} key={icon.index}/>)
                        }
                        else
                        {
                            return <GameRow game={game} key={game.index}/>
                        }
                    })}
                </tbody>
            </table>
        </div>
    );
}

export default GameTable;