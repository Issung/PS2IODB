import './GameTable.scss'
import { Game } from '../model/Game';
import GameRow from './GameRow';
import IconRow from './IconRow';
import React from 'react';
import RowBase, { Trait } from './RowBase';

type GameTableProps = {
    games: Game[];
}

const GameTable: React.FC<GameTableProps> = ({ games }: GameTableProps) => {
    return (
        <div id="GameTable">
            <h4 style={{ textAlign: 'left' }}>{games.length === 0 ? 'No Results.' : `${games.length} Results`}</h4>
            <table>
                <tbody>
                    {games.map(game => {
                        if (game.icons.length > 1)
                        {
                            return <React.Fragment key={game.index}>
                                <RowBase 
                                    title={game.name}
                                    contributed={game.icons.some(i => i.code)}
                                    circle={Trait.MultiIcon}
                                    tooltip="This title has multiple icons"
                                />
                                <tr className="subicons">
                                    <td className="line">
                                    </td>
                                    <table>
                                        <tbody>
                                            {game.icons.map(icon => <IconRow icon={icon} key={icon.index}/>)}
                                        </tbody>
                                    </table>
                                </tr>
                            </React.Fragment>
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