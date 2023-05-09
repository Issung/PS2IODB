import React, { useRef } from 'react';
import { useState } from 'react';
import { GameEntry, GameList } from './Games';

type GameTableProps = {
    games: GameEntry[];
}

type GameTableState = {
    games: GameEntry[];
};

class GameTable extends React.Component<GameTableProps, GameTableState> {
    constructor(props: GameTableProps) {
        super(props);
        this.state = {
            games: props.games
        }
    }

    setGames = (games: GameEntry[]) => {
        this.setState({ games: games });
    }

    render() {return(
        <table>
            <thead>
                <tr>
                    <th>Game Title</th>
                    {/* <th>Icons</th> */}
                </tr>
            </thead>
            <tbody>
                {this.state.games.map(entry => (
                    <GameRow key={entry.code} game={entry}/>
                ))}
            </tbody>
        </table>
    );}
}

interface GameRowProps {
    game: GameEntry;
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