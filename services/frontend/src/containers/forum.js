import React from 'react';
import { bindActionCreators } from 'redux';
import { connect } from 'react-redux'
import { Link } from 'react-router-dom'
import { goToTop } from 'react-scrollable-anchor'

import { Button, Dimmer, Header, Label, Loader, Popup, Segment } from 'semantic-ui-react'

import * as GLOBAL from '../global';
import * as breadcrumbActions from '../actions/breadcrumbActions'
import * as postActions from '../actions/postActions'
import * as statusActions from '../actions/statusActions'

import Paginator from '../components/global/paginator'
import ForumHeader from '../components/elements/forum/header'
import ForumTitle from '../components/elements/forum/title'
import Forum404 from '../components/elements/forum/404'
import ForumPost from '../components/elements/forum/post'
import PostForm from '../components/elements/post/form'

class Forum extends React.Component {
  constructor(props, state) {
    goToTop()
    super(props, state);
    this.state = {
      page: 1,
      topics: false,
      showNewPost: false,
      forum: {
        name: this.props.forumid
      }
    };
    this.getForum = this.getForum.bind(this);
  }

  changePage = (page) => {
    this.setState({page: page})
    this.getForum(page)
  }

  showNewPost = (e) => {
    this.setState({
      page: 1,
      showNewPost: true
    })
  }

  hideNewPost = (e) => {
    this.setState({
      showNewPost: false
    })
  }

  componentWillMount() {
    this.props.actions.resetPostState()
  }

  componentDidMount() {
    this.getForum()
  }

  async getForum(page = 1) {
    this.setState({
      topics: false,
      showNewPost: false
    })
    try {
      const { forumid } = this.props
      const response = await fetch(`${ GLOBAL.REST_API }/forum/${ forumid }?page=${ page }`)
      if (response.ok) {
        const result = await response.json()
        this.setState({
          forum: result.forum,
          topics: result.data
        });
        this.props.actions.setStatus({'height': result.height});
        this.props.actions.setBreadcrumb([
          {
            name: result.forum.name,
            link: `/forum/${result.forum._id}`
          }
        ])
      } else {
        console.error(response.status);
      }
    } catch(e) {
      console.error(e);
    }
  }

  render() {
    let forum = this.state.forum,
        page = this.state.page,
        isUser = this.props.account.isUser,
        perPage = 20,
        posts = 0,
        loaded = (typeof this.state.topics === 'object'),
        topics = this.state.topics,
        newPostButton = (
          <Popup
            trigger={
              <Button floated='left' size='tiny'>
                <i className='pencil icon'></i>
                Create new post
              </Button>
            }
            position='bottom center'
            inverted
            content='You must be logged in to post.'
            basic
          />
        ),
        display = (
          <Dimmer inverted active style={{minHeight: '100px', display: 'block'}}>
            <Loader size='large' content='Loading'/>
          </Dimmer>
        )
    if(isUser) {
      newPostButton = (
        <Button floated='left' color='green' size='tiny' onClick={this.showNewPost}>
          <i className='pencil icon'></i>
          Create new post
        </Button>
      )
    }
    // Disable posting for forums based on a list of accounts
    if(forum.accounts && forum.accounts.length > 0) {
      newPostButton = false
    }
    if(loaded) {
      posts = (forum.stats) ? forum.stats.posts : 0
      if(topics.length > 0) {
        let rows = topics.map((topic, idx) => <ForumPost topic={topic} key={idx} />)
        display = (
          <div>
            <Segment basic clearing>
              {newPostButton}
              <Paginator
                page={page}
                perPage={perPage}
                total={posts}
                callback={this.changePage}
                />
            </Segment>
            <ForumHeader />
            {rows}
            <Segment basic clearing>
              {newPostButton}
              <Paginator
                page={page}
                perPage={perPage}
                total={posts}
                callback={this.changePage}
                />
            </Segment>
          </div>
        )
      } else {
        display = <Forum404 forum={forum} isUser={isUser} showNewPost={this.showNewPost} />
      }
    }
    if(forum._id && this.state.showNewPost) {
      let formHeader = (
        <Header size='large'>
          Create a new Post
          <Header.Subheader>
            This post will automatically be tagged with
            <Label horizontal>
              #{forum.tags[0]}
            </Label>
            as the first tag to post in the
            {' '}
            <Link to={`/forum/${forum._id}`}>
              {forum.name}
            </Link>
            {' '}
            forum.
          </Header.Subheader>
        </Header>
      )
      display = (
        <PostForm
          formHeader={formHeader}
          forum={forum}
          elements={['body', 'title', 'tags']}
          onCancel={this.hideNewPost}
          onComplete={this.getForum}
          { ... this.props } />
      )
    }
    return(
      <div>
        <ForumTitle
          forum={forum}
          { ... this.props } />
        {display}
      </div>
    );
  }
}

function mapStateToProps(state, ownProps) {
  return {
    account: state.account
  }
}

function mapDispatchToProps(dispatch) {
  return {actions: bindActionCreators({
    ...breadcrumbActions,
    ...postActions,
    ...statusActions
  }, dispatch)}
}

export default connect(mapStateToProps, mapDispatchToProps)(Forum);
