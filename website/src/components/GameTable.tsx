import React from 'react';
import { Link } from 'react-router-dom';
import { Game } from '../model/Game';

type GameTableProps = {
    games: Game[];
}

const GameTable: React.FC<GameTableProps> = ({ games }: GameTableProps) => {
    return (
        <div className="gametable">
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

interface GameRowProps {
    game: Game;
}

const GameRow = (props: GameRowProps) => {
    return (
        <tr>
            <td>
                {props.game.code ? 
                    <Link to={`/icon/${props.game.code}`}>
                        <h6 style={{color: '#6f6fff'}}>{props.game.name}</h6>
                    </Link> : 
                    <h6>{props.game.name}</h6>
                }
            </td>
        </tr>
    )
};

export default GameTable;