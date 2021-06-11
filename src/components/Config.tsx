import React from 'react';
import { Modal, Button } from 'antd';
import TextArea from 'antd/lib/input/TextArea';
import { getConfig } from '../hobbitonApi';

type Props = {
  clientUrl: string;
  name?: string;

  onOk?: (e: React.MouseEvent<HTMLElement, MouseEvent>) => void;
  onCancel?: (e: React.MouseEvent<HTMLElement, MouseEvent>) => void;
};

type State = {
  confirmLoading: boolean;
  config?: string;
};

class Config extends React.Component<Props, State> {
  state: Readonly<State> = {
    confirmLoading: false
  };

  //  static getDerivedStateFromProps(props:Props, state:State):Partial<State>|undefined{
  // if (props.name !== state.name){
  //     return {
  //         name: props.name
  //     }
  // }
  //   }

  async componentDidUpdate(prevProps: Readonly<Props>, prevState: Readonly<State>) {
    if (prevProps.name !== this.props.name && this.props.name) {
      const data = await getConfig(this.props.clientUrl, this.props.name);

      this.setState({
        config: data.config
      });
    }
  }

  handleOk = (e: React.MouseEvent<HTMLElement, MouseEvent>) => {
    this.setState({
      confirmLoading: true
    });

    setTimeout(() => {
      this.setState({
        confirmLoading: false
      });

      this.props.onOk && this.props.onOk(e);
    }, 2000);
  };

  render() {
    const { name, onCancel } = this.props;
    const { config, confirmLoading } = this.state;

    return (
      <div>
        <Modal
          title="Configuration"
          visible={Boolean(name)}
          onOk={this.handleOk}
          confirmLoading={confirmLoading}
          onCancel={onCancel}
        >
          <TextArea autosize={{ minRows: 10 }} value={config || ''} />
        </Modal>
      </div>
    );
  }
}

export default Config;
