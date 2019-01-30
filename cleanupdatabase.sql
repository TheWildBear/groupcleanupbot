CREATE DATABASE cleanupbot;
USE cleanupbot;
DROP TABLE IF EXISTS `Cleanupgroup`;
CREATE TABLE `Cleanupgroup` (
  `Groupid` double NOT NULL,
  `timer` double DEFAULT NULL,
  PRIMARY KEY (`Groupid`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

DROP TABLE IF EXISTS `GroupUserTime`;
CREATE TABLE `GroupUserTime` (
  `Time` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `fk_groupid` double NOT NULL,
  `fk_userid` double NOT NULL,
  PRIMARY KEY (`fk_groupid`,`fk_userid`),
  KEY `fk_groupid_idx` (`fk_groupid`),
  KEY `fk_user_idx` (`fk_userid`),
  CONSTRAINT `fk_groupid` FOREIGN KEY (`fk_groupid`) REFERENCES `Cleanupgroup` (`Groupid`) ON DELETE NO ACTION ON UPDATE NO ACTION,
  CONSTRAINT `fk_userid` FOREIGN KEY (`fk_userid`) REFERENCES `User` (`Userid`) ON DELETE NO ACTION ON UPDATE NO ACTION
) ENGINE=InnoDB DEFAULT CHARSET=latin1;

DROP TABLE IF EXISTS `User`;
CREATE TABLE `User` (
  `Userid` double NOT NULL,
  PRIMARY KEY (`Userid`)
) ENGINE=InnoDB DEFAULT CHARSET=latin1;
